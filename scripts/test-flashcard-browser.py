"""Keyboard regression for a local Expo export; requires QA_EXPORT and Chromium."""
import os
import re
from playwright.sync_api import sync_playwright
from browser_export import exported_site


def verify():
    with exported_site() as origin, sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get('QA_CHROMIUM'), args=['--no-sandbox'])
        context = browser.new_context(service_workers='block')
        context.route('**/*', lambda route: route.continue_()
                      if route.request.url.startswith(origin + '/') and route.request.method == 'GET'
                      else route.abort())
        context.add_init_script("""localStorage.setItem('@nova/dailyGreeting.v1:guest',
            new Date().toLocaleDateString('sv-SE'));""")
        page = context.new_page()
        page.set_default_timeout(10000)
        page.goto(origin + '/flashcards')
        question = page.get_by_role('button', name=re.compile('^Question:')).first
        name = question.get_attribute('aria-label').removeprefix('Question: ')
        save = page.get_by_role('button', name='Save to Collections: ' + name, exact=True)
        assert save.evaluate('(b) => b.closest("button") === b && !b.parentElement.closest("button")')
        assert save.bounding_box()['height'] >= 44 and save.bounding_box()['width'] >= 44
        question.focus()
        page.keyboard.press('Enter')
        page.get_by_role('button', name=re.compile('^Answer:')).first.wait_for()
        page.keyboard.press('Tab')
        assert save.evaluate('(b) => b === document.activeElement')
        page.keyboard.press('Enter')
        page.get_by_text('Flashcard Saved', exact=True).first.wait_for()
        page.goto(origin + '/collections')
        page.get_by_text(name, exact=True).first.wait_for()
        page.reload()
        page.get_by_text(name, exact=True).first.wait_for()
        browser.close()


if __name__ == '__main__':
    verify()
    print('PASS keyboard flip/save, sibling controls, target size, persisted collection')
