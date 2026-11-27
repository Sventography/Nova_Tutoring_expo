"""Exercise real Discover adventure persistence UI with local-only storage faults.

QA_EXPORT=/path/to/isolated/export QA_CHROMIUM=/path/to/chromium \
    python scripts/test-adventure-save-browser.py

The original app bundle runs unchanged. Only the browser Storage adapter is
instrumented. Its delayed setItem return is a thenable adopted by AsyncStorage's
createPromise, allowing the native-like pending state to be observed on web.
Synthetic authentication responses never leave the browser request interceptor.
"""

import importlib.util
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import Error, expect, sync_playwright
from browser_export import exported_site


auth_spec = importlib.util.spec_from_file_location(
    "nova_local_auth", Path(__file__).with_name("test-account-switch-browser.py")
)
auth_module = importlib.util.module_from_spec(auth_spec)
auth_spec.loader.exec_module(auth_module)

ADVENTURE = "The scene that changes everything"
JOURNEY_PREFIX = "@nova/discover/journey.v1/"
FIXTURE = r"""
(() => {
  const originalGet = Storage.prototype.getItem;
  const originalSet = Storage.prototype.setItem;
  const prefix = '@nova/discover/journey.v1/';
  const qa = window.__journeyQA = {
    readFailures: 0, writeFailures: 0, holdWrites: false,
    reads: [], attempts: [], commits: [], pending: [], rejections: [],
    read: key => originalGet.call(localStorage, key),
    release: () => {
      const operation = qa.pending.shift();
      if (!operation) throw new Error('No pending journey write');
      operation.commit();
    }
  };
  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    const captured = typeof reason === 'object' && reason !== null
      ? Object.fromEntries(Object.getOwnPropertyNames(reason).map(key => [key, reason[key]]))
      : String(reason);
    qa.rejections.push(captured);
    if (window.__captureJourneyQARejection) window.__captureJourneyQARejection(captured);
  });
  Storage.prototype.getItem = function(key) {
    // Keep unrelated daily-greeting overlays dismissed for every fixture owner.
    if (this === localStorage && String(key).startsWith('@nova/dailyGreeting.v1:')) {
      return new Date().toLocaleDateString('sv-SE');
    }
    if (this === localStorage && String(key).startsWith(prefix)) {
      qa.reads.push(String(key));
      if (qa.readFailures > 0) {
        qa.readFailures--;
        throw new Error('Synthetic journey read failure');
      }
    }
    return originalGet.call(this, key);
  };
  Storage.prototype.setItem = function(key, value) {
    if (this !== localStorage || !String(key).startsWith(prefix)) {
      return originalSet.call(this, key, value);
    }
    qa.attempts.push({key: String(key), value: String(value)});
    if (qa.writeFailures > 0) {
      qa.writeFailures--;
      throw new Error('Synthetic journey write failure');
    }
    const storage = this;
    const commit = () => {
      originalSet.call(storage, key, value);
      qa.commits.push({key: String(key), value: String(value)});
    };
    if (qa.holdWrites) {
      return new Promise((resolve, reject) => {
        qa.pending.push({key: String(key), value: String(value), commit: () => {
          try { commit(); resolve(undefined); } catch(error) { reject(error); }
        }});
      });
    }
    commit();
  };
  originalSet.call(localStorage, '@nova/dailyGreeting.v1:guest', new Date().toLocaleDateString('sv-SE'));
})();
"""


def setup(browser, origin, width=1280, touch=False, read_failure=False, authenticated=False):
    context = browser.new_context(
        viewport={"width": width, "height": 844}, has_touch=touch,
        is_mobile=touch, reduced_motion="reduce", service_workers="block",
    )
    blocked = []
    auth = auth_module.LocalAuth(origin) if authenticated else None
    if auth:
        auth.qa_rejections = []
        auth.qa_rejected_paths = set()
        context.expose_binding("__captureJourneyQARejection",
                               lambda source, reason: auth.qa_rejections.append(reason))

    def route(request):
        if auth:
            return auth.route(request)
        if request.request.url.startswith(origin + "/") and request.request.method in ("GET", "HEAD"):
            return request.continue_()
        blocked.append(request.request.url)
        request.abort()

    context.route("**/*", route)
    context.route_web_socket("**/*", lambda socket: socket.close())
    script = FIXTURE + ("\nwindow.__journeyQA.readFailures = 1;" if read_failure else "")
    context.add_init_script(script)
    page = context.new_page()
    page.set_default_timeout(15000)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    if auth:
        page.on("response", lambda response: auth.qa_rejected_paths.add(urlsplit(response.url).path)
                if response.status == 403 else None)
    return context, page, errors, blocked, auth


def dismiss(page):
    for label in ("Maybe Later", "Got It"):
        button = page.get_by_role("button", name=label, exact=True)
        if button.count() and button.first.is_visible():
            button.first.click()


def open_adventure(page):
    page.get_by_text(ADVENTURE, exact=True).last.click()
    marker = page.get_by_text("LEARNING ADVENTURE · " + ADVENTURE, exact=True)
    expect(marker).to_be_visible()
    return marker.locator("..")


def finish_adventure(panel):
    for answer in ("The wrapped gift", "Let the ticking continue"):
        panel.get_by_role("button", name=answer, exact=True).click()
        panel.get_by_role("button", name="Continue the story", exact=True).click()
    expect(panel.get_by_role("heading", name="How your choices shaped this ending", exact=True)).to_be_visible()


def finish_replay(panel):
    panel.get_by_role("button", name="Replay and experiment", exact=True).click()
    finish_adventure(panel)


def evidence(page):
    return page.evaluate("""() => ({
        reads: __journeyQA.reads, attempts: __journeyQA.attempts,
        commits: __journeyQA.commits, pending: __journeyQA.pending.length
    })""")


def save_failure_retry(browser, origin, width, touch):
    context, page, errors, blocked, _ = setup(browser, origin, width, touch)
    try:
        page.goto(origin + "/discover")
        dismiss(page)
        panel = open_adventure(page)
        page.evaluate("__journeyQA.writeFailures = 1")
        finish_adventure(panel)
        # The baseline displayed this error far below the adventure, leaving
        # the ending without feedback. Assert the message in the actual panel.
        feedback = panel.get_by_text("Could not save your journey. Please try again.", exact=True)
        expect(feedback).to_be_visible()
        expect(feedback).to_have_attribute("aria-live", "polite")
        assert len(evidence(page)["attempts"]) == 1
        assert not evidence(page)["commits"]
        page.evaluate("__journeyQA.holdWrites = true")
        panel.get_by_role("button", name="Save this adventure to my journey", exact=True).click()
        pending = panel.get_by_role("button", name="Saving…", exact=True)
        expect(pending).to_be_disabled()
        expect(panel.get_by_text("Saving your journey…", exact=True)).to_be_visible()
        assert evidence(page)["pending"] == 1
        pending.evaluate("node => { for (let i=0; i<5; i++) node.click(); }")
        assert len(evidence(page)["attempts"]) == 2
        page.evaluate("__journeyQA.holdWrites = false; __journeyQA.release()")
        expect(panel.get_by_text("Saved to your learning journey.", exact=True)).to_be_visible()
        after = evidence(page)
        assert len(after["commits"]) == 1
        assert json.loads(after["commits"][0]["value"])["completed"] == ["silent-film"]
        finish_replay(panel)
        assert len(evidence(page)["attempts"]) == 2
        page.reload()
        dismiss(page)
        panel = open_adventure(page)
        finish_adventure(panel)
        expect(panel.get_by_text("Saved to your learning journey.", exact=True)).to_be_visible()
        assert not evidence(page)["attempts"], evidence(page)
        assert not errors, errors
        print(json.dumps({"case":"save-failure-retry-busy-replay-reload", "width":width,
                          "result":"PASS", "successful_writes":1,
                          "blocked_external_requests":len(blocked)}), flush=True)
    finally:
        context.close()


def load_failure_retry(browser, origin):
    context, page, errors, blocked, _ = setup(browser, origin, read_failure=True)
    try:
        page.goto(origin + "/discover")
        dismiss(page)
        panel = open_adventure(page)
        finish_adventure(panel)
        expect(panel.get_by_text("Your journey is not loaded. Your ending is still here.", exact=True)).to_be_visible()
        assert not evidence(page)["attempts"]
        panel.get_by_role("button", name="Retry loading journey", exact=True).click()
        save = panel.get_by_role("button", name="Save this adventure to my journey", exact=True)
        expect(save).to_be_enabled()
        expect(panel.get_by_role("heading", name="A familiar rhythm", exact=True)).to_be_visible()
        save.click()
        expect(panel.get_by_text("Saved to your learning journey.", exact=True)).to_be_visible()
        assert len(evidence(page)["commits"]) == 1
        assert not errors, errors
        print(json.dumps({"case":"initial-load-failure-retry-preserves-ending", "result":"PASS",
                          "blocked_external_requests":len(blocked)}), flush=True)
    finally:
        context.close()


def owner_switch(browser, origin):
    context, page, errors, _, auth = setup(browser, origin, authenticated=True)
    try:
        def visit(path):
            try:
                page.goto(origin + path, wait_until="domcontentloaded")
            except Error as error:
                if "ERR_ABORTED" not in str(error):
                    raise
                page.goto(origin + path, wait_until="domcontentloaded")
            dismiss(page)

        def sign_in(index, signup):
            visit("/sign-in")
            if signup:
                page.get_by_placeholder("NovaUser").fill("qa" + str(index))
                email = page.get_by_placeholder("you@example.com")
            else:
                page.get_by_text("Log In", exact=True).first.click()
                email = page.get_by_label("Login email")
            email.fill(auth_module.EMAILS[index])
            for field in page.get_by_placeholder("••••••••").all():
                field.fill(auth_module.PASSWORD)
            page.get_by_text("Create Account" if signup else "Log In", exact=True).last.click()
            page.wait_for_function("location.pathname !== '/sign-in'")

        def sign_out():
            visit("/account")
            page.get_by_text("Sign Out", exact=True).first.click()
            page.wait_for_function("location.pathname !== '/account'")

        sign_in(0, True)
        visit("/discover")
        panel = open_adventure(page)
        page.evaluate("__journeyQA.holdWrites = true")
        finish_adventure(panel)
        expect(panel.get_by_role("button", name="Saving…", exact=True)).to_be_disabled()
        first = evidence(page)
        assert first["pending"] == 1
        owner_a_key = first["attempts"][0]["key"]
        assert owner_a_key.endswith(auth.users[auth_module.EMAILS[0]]["id"])

        # Use client navigation so the original pending promise remains alive.
        page.get_by_role("button", name="ACCOUNT tab", exact=True).click()
        page.get_by_text("Sign Out", exact=True).first.click()
        page.wait_for_function("location.pathname !== '/account'")
        # Any full reload would destroy the promise. Capture this condition and
        # complete its account-scoped write before continuing the second login.
        assert evidence(page)["pending"] == 1, "Navigation replaced the document"
        page.evaluate("__journeyQA.holdWrites = false; __journeyQA.release()")
        page.wait_for_function("__journeyQA.commits.length === 1")
        stored_a = page.evaluate("key => JSON.parse(__journeyQA.read(key))", owner_a_key)
        assert stored_a["completed"] == ["silent-film"]
        assert page.evaluate("__journeyQA.read('@nova/discover/journey.v1/guest')") is None

        sign_in(1, True)
        visit("/discover")
        panel = open_adventure(page)
        page.evaluate("__journeyQA.writeFailures = 1")
        finish_adventure(panel)
        expect(panel.get_by_text("Could not save your journey. Please try again.", exact=True)).to_be_visible()
        assert not panel.get_by_text("Saved to your learning journey.", exact=True).count()
        owner_b_key = evidence(page)["attempts"][0]["key"]
        assert owner_b_key != owner_a_key
        assert owner_b_key.endswith(auth.users[auth_module.EMAILS[1]]["id"])
        assert page.evaluate("key => __journeyQA.read(key)", owner_b_key) is None
        sign_out()
        sign_in(0, False)
        visit("/discover")
        panel = open_adventure(page)
        finish_adventure(panel)
        expect(panel.get_by_text("Saved to your learning journey.", exact=True)).to_be_visible()
        assert not evidence(page)["attempts"]
        # The shared deliberately minimal auth fixture rejects unsupported
        # background RPCs. Only its exact known synthetic error is permitted;
        # unexpected application exceptions still fail this test.
        assert all(reason == {"message":"fixture operation unavailable"}
                   for reason in auth.qa_rejections), auth.qa_rejections
        assert len(errors) == len(auth.qa_rejections) and all(error == "Object" for error in errors), {
            "page_errors":errors, "rejections":auth.qa_rejections}
        print(json.dumps({"case":"pending-account-a-save-signout-guest-account-b-return-a",
                          "result":"PASS", "real_auth_requests":0,
                          "expected_fixture_rejections":len(auth.qa_rejections),
                          "fixture_rejected_paths":sorted(auth.qa_rejected_paths)}), flush=True)
    finally:
        context.close()


def main():
    with exported_site() as origin, sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=os.environ.get("QA_CHROMIUM", "/usr/bin/chromium"), args=["--no-sandbox"]
        )
        try:
            save_failure_retry(browser, origin, 1280, False)
            save_failure_retry(browser, origin, 390, True)
            load_failure_retry(browser, origin)
            owner_switch(browser, origin)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
