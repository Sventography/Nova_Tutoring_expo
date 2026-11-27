"""From the repository root, run QA_EXPORT=/absolute/export QA_CHROMIUM=/path/to/chromium python scripts/test-integrated-discover.py."""
import functools
import json
import os
import re
import subprocess
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright


class StaticExport(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        target = Path(super().translate_path(path))
        html = Path(str(target) + ".html")
        return str(html if html.is_file() and not target.is_file() else target)

    def log_message(self, *_args):
        pass


def adventure_paths():
    """Use the real scene graph to exercise one complete path through each campaign."""
    script = """
    const fs = require('fs'), ts = require('typescript');
    const source = fs.readFileSync('app/_lib/adventureModel.ts', 'utf8');
    const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
    const mod = {exports:{}};
    new Function('module','exports',compiled)(mod, mod.exports);
    const paths = mod.exports.ADVENTURES.map(adventure => {
      let scene = adventure.scenes[adventure.start];
      const moves = [], seen = new Set();
      while (scene.choices.length) {
        if (seen.has(scene)) throw Error('Cycle in ' + adventure.title);
        seen.add(scene);
        moves.push(scene.choices[0].label);
        scene = adventure.scenes[scene.choices[0].next];
      }
      return {title:adventure.title, moves, ending:scene.title};
    });
    process.stdout.write(JSON.stringify(paths));
    """
    return json.loads(subprocess.check_output(["node", "-e", script], text=True))


def check(page):
    page.get_by_text("100 discoveries found", exact=True).wait_for()
    cards = page.get_by_role("button").filter(has_text=re.compile("Open discovery|Currently exploring above"))
    titles = cards.evaluate_all('elements => elements.map(e => e.innerText.split("\\n").filter(Boolean)[1])')
    assert len(titles) == len(set(titles)) == 100
    workshops = set()
    for index, title in enumerate(titles):
        card = cards.nth(index)
        card.press("Enter")
        expect(page.get_by_role("heading", name=title, exact=True)).to_be_visible()
        expect(card).to_contain_text("Currently exploring above")
        if page.get_by_role("heading", name="Build an orbit", exact=True).count():
            for label in ["0.5 AU", "Less time", "Advance one month"]:
                page.get_by_role("button", name=label, exact=True).press("Enter")
            expect(page.get_by_text("Your prediction matches this model.", exact=False)).to_be_visible()
            workshops.add("orbit")
        if page.get_by_text("Circuit Commons robot workshop", exact=True).count():
            workshops.add("robot")
    assert workshops == {"orbit", "robot"}
    paths = adventure_paths()
    for adventure in paths:
        page.get_by_role("button").filter(has_text=adventure["title"]).filter(has_text="Begin adventure").press("Enter")
        for label in adventure["moves"]:
            page.get_by_role("button", name=label, exact=True).press("Enter")
            page.get_by_role("button", name="Continue the story", exact=True).press("Enter")
        expect(page.get_by_role("heading", name=adventure["ending"], exact=True)).to_be_visible()
        expect(page.get_by_text("Saved to your learning journey.", exact=True)).to_be_visible()
        page.get_by_role("button", name="Back to Discover", exact=True).press("Enter")
    page.reload()
    expect(page.get_by_text(f"{len(paths)} adventures explored", exact=False)).to_be_visible()
    print(f"PASS {len(titles)} distinct lessons, both workshop routes and {len(paths)} completed, persisted adventures")


def main():
    directory = Path(os.environ["QA_EXPORT"]).resolve()
    assert (directory / "discover.html").is_file(), "Export web first"
    handler = functools.partial(StaticExport, directory=str(directory))
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server, sync_playwright() as playwright:
        threading.Thread(target=server.serve_forever, daemon=True).start()
        origin = f"http://127.0.0.1:{server.server_port}"
        browser = playwright.chromium.launch(executable_path=os.environ["QA_CHROMIUM"],
                                             args=["--no-sandbox", "--renderer-process-limit=1"])
        context = browser.new_context(service_workers="block", reduced_motion="reduce")
        context.route("**/*", lambda route: route.continue_() if
                      urlparse(route.request.url).netloc == urlparse(origin).netloc and
                      route.request.method in {"GET", "HEAD"} else route.abort())
        context.add_init_script("localStorage.setItem('@nova/dailyGreeting.v1:guest', new Date().toLocaleDateString('sv-SE'))")
        errors = []
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        try:
            page.goto(origin + "/discover")
            check(page)
            assert not errors, errors
        finally:
            browser.close()
            server.shutdown()


if __name__ == "__main__":
    main()
