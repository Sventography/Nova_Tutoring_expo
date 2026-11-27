"""Registration, local persistence and account switching on an isolated Expo export.

Set QA_EXPORT to a local isolated-preview export and optionally set QA_CHROMIUM.
The synthetic auth service exists only in the browser's request interceptor. It
does not contact Supabase, confirm real email or verify hosted row-level policies.
"""
import base64
import hashlib
import hmac
import json
import os
import time
import uuid
from urllib.parse import urlsplit

from playwright.sync_api import Error, sync_playwright
from browser_export import exported_site


STAGING_HOST = 'gouhhltupxaycuysdtrw.supabase.co'
EMAILS = ['qa1@example.invalid', 'qa2@example.invalid']
PASSWORD = 'local-fixture-password'


def encoded(data):
    return base64.urlsafe_b64encode(data).decode().rstrip('=')


class LocalAuth:
    def __init__(self, origin):
        self.origin = origin
        self.users = {}
        self.sessions = {}

    def session(self, user):
        now = int(time.time())
        claims = {'iat': now, 'exp': now + 3600, 'sub': user['id'], 'role': 'authenticated',
                  'aud': 'authenticated', 'session_id': str(uuid.uuid4())}
        body = '.'.join(encoded(json.dumps(part).encode())
                        for part in ({'alg': 'HS256', 'typ': 'JWT'}, claims))
        signature = hmac.new(b'test-fixture-only', body.encode(), hashlib.sha256).digest()
        token = body + '.' + encoded(signature)
        self.sessions[token] = user
        return {'access_token': token, 'token_type': 'bearer', 'expires_in': 3600,
                'expires_at': now + 3600, 'refresh_token': str(uuid.uuid4()), 'user': user}

    def route(self, route):
        req = route.request
        if req.url.startswith(self.origin + '/') and req.method in ('GET', 'HEAD'):
            return route.continue_()
        url = urlsplit(req.url)
        if url.hostname != STAGING_HOST:
            return route.abort()

        def respond(result, code=200):
            headers = {'Access-Control-Allow-Origin': self.origin, 'Access-Control-Allow-Headers': '*',
                       'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,PATCH,DELETE'}
            return route.fulfill(status=code, content_type='application/json',
                                 headers=headers, body=json.dumps(result))

        token = req.headers.get('authorization', '').removeprefix('Bearer ')
        user = self.sessions.get(token)
        if req.method == 'OPTIONS':
            return respond({})
        if url.path == '/rest/v1/rpc/check_username':
            return respond('ok')
        if url.path == '/auth/v1/signup':
            data = req.post_data_json
            email = data['email']
            if email not in EMAILS or email in self.users or data['password'] != PASSWORD:
                return respond({}, 400)
            user = {'id': str(uuid.uuid4()), 'aud': 'authenticated', 'role': 'authenticated',
                    'email': email, 'user_metadata': data['data'],
                    'app_metadata': {'provider': 'email', 'providers': ['email']},
                    'identities': [{'id': str(uuid.uuid4()), 'provider': 'email'}]}
            self.users[email] = user
            return respond(self.session(user))
        if url.path == '/auth/v1/token':
            data = req.post_data_json
            user = self.users.get(data.get('email'))
            if not user or data.get('password') != PASSWORD:
                return respond({'error': 'invalid_grant'}, 400)
            return respond(self.session(user))
        if url.path == '/auth/v1/user':
            return respond(user or {}, 200 if user else 401)
        if url.path == '/auth/v1/logout':
            self.sessions.pop(token, None)
            return respond({})
        if url.path == '/rest/v1/profiles' and user:
            name = user['user_metadata']['username']
            profile = {'id': user['id'], 'username': name, 'display_name': name, 'coins': 0}
            return respond(profile if 'object+' in req.headers.get('accept', '') else [profile])
        if req.method == 'GET' and url.path.startswith('/rest/v1/'):
            return respond([])
        return respond({'message': 'fixture operation unavailable'}, 403)


def verify():
    with exported_site() as origin, sync_playwright() as playwright:
        br = playwright.chromium.launch(executable_path=os.environ.get('QA_CHROMIUM'),
                                       args=['--no-sandbox'])
        context = br.new_context(service_workers='block')
        fixture = LocalAuth(origin)
        context.route('**/*', fixture.route)
        context.route_web_socket('**/*', lambda ws: ws.close())
        context.add_init_script("localStorage.setItem('@nova/dailyGreeting.v1:guest', "
                                "new Date().toLocaleDateString('sv-SE'));")
        page = context.new_page()
        page.set_default_timeout(10000)

        def text(label):
            return page.get_by_text(label, exact=True).first

        def visit(path):
            # Signing out can still be replacing the landing route with the tutorial.
            try:
                page.goto(origin + path, wait_until='domcontentloaded')
            except Error as error:
                if 'ERR_ABORTED' not in str(error):
                    raise
                page.goto(origin + path, wait_until='domcontentloaded')

        def authenticate(index, signup):
            visit('/sign-in')
            if signup:
                page.get_by_placeholder('NovaUser').fill('qa' + str(index))
                field = page.get_by_placeholder('you@example.com')
            else:
                text('Log In').click()
                field = page.get_by_label('Login email')
            field.fill(EMAILS[index])
            for password_field in page.get_by_placeholder('••••••••').all():
                password_field.fill(PASSWORD)
            page.get_by_text('Create Account' if signup else 'Log In', exact=True).last.click()
            page.wait_for_function("location.pathname !== '/sign-in'")
            visit('/account')
            text('Sign Out').wait_for()

        def logout():
            visit('/account')
            text('Sign Out').click()
            page.wait_for_function("location.pathname !== '/account'")

        def save_note(title):
            visit('/journal')
            page.get_by_role('button', name='New note', exact=True).click()
            page.get_by_label('Note title').fill(title)
            page.get_by_label('Note body').fill('Synthetic private note.')
            page.get_by_role('button', name='Save note', exact=True).click()
            text(title).wait_for()
            page.reload()
            text(title).wait_for()

        def check_notes(expected, hidden):
            visit('/journal')
            page.get_by_role('button', name='New note', exact=True).wait_for()
            if expected:
                text(expected).wait_for()
            assert not text(hidden).count()

        a, b, card = 'Isolated note A', 'Isolated note B', 'Isolated flashcard A'
        authenticate(0, True)
        save_note(a)
        visit('/collections')
        page.get_by_placeholder('Front (question/prompt)').fill(card)
        page.get_by_placeholder('Back (answer)').fill('Synthetic answer.')
        text('Add Card').click()
        text(card).wait_for()
        logout()
        check_notes(None, a)
        authenticate(1, True)
        check_notes(None, a)
        save_note(b)
        logout()
        authenticate(0, False)
        check_notes(a, b)
        visit('/collections')
        text(card).wait_for()
        logout()
        for signed_in in (False, True):
            if signed_in:
                authenticate(1, False)
            visit('/collections')
            text('0 sets • 0 cards').wait_for()
            assert not text(card).count()
        br.close()


if __name__ == '__main__':
    verify()
    print('PASS two mock registrations, login, account switching, private notes and study cards')
