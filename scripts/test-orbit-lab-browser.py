"""Exercise the exported Orbit Lab as a guest, with all external traffic blocked.

QA_EXPORT=/path/to/export QA_CHROMIUM=/usr/bin/chromium python scripts/test-orbit-lab-browser.py
Optional QA_SCREENSHOTS saves controls and results at each viewport.
"""

import functools
import json
import os
import re
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


class ExportHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        base = Path(super().translate_path(path))
        exported_route = Path(str(base) + ".html")
        return str(exported_route) if exported_route.is_file() and not base.is_file() else str(base)

    def log_message(self, *_args):
        pass


export = Path(os.environ["QA_EXPORT"]).resolve()
assert (export / "discover.html").is_file(), f"Missing Discover export: {export}"
server = ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(ExportHandler, directory=str(export))
)
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f"http://127.0.0.1:{server.server_port}"


def exercise(browser, name, width, touch):
    context = browser.new_context(
        viewport={"width": width, "height": 844},
        has_touch=touch,
        is_mobile=touch,
        reduced_motion="reduce",
        service_workers="block",
    )
    blocked_requests = []

    def local_only(route):
        request = route.request
        if request.url.startswith(origin + "/") and request.method in ("GET", "HEAD"):
            route.continue_()
        else:
            blocked_requests.append(request.url)
            route.abort()

    context.route("**/*", local_only)
    # A fresh context is a synthetic guest, never a real learner or account.
    context.add_init_script(
        "localStorage.setItem('@nova/dailyGreeting.v1:guest', new Date().toLocaleDateString('sv-SE'));"
    )
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_default_timeout(15000)

    def activate(locator, key="Enter"):
        if touch:
            locator.tap()
        else:
            locator.focus()
            expect(locator).to_be_focused()
            locator.press(key)

    try:
        page.goto(origin + "/discover")
        for label in ("Maybe Later", "Got It"):
            dismissal = page.get_by_role("button", name=label, exact=True)
            if dismissal.count() and dismissal.first.is_visible():
                activate(dismissal.first)
        search = page.get_by_role("textbox", name="Search discovery topics", exact=True)
        search.fill("Moon")
        topic = page.get_by_role(
            "button", name=re.compile(r"Why doesn't the Moon fall straight down\?")
        ).last
        activate(topic)
        heading = page.get_by_role("heading", name="Build an orbit", exact=True)
        expect(heading).to_be_visible()
        lab = heading.locator("..")

        def button(label):
            return lab.get_by_role("button", name=label, exact=True)

        def state(month):
            value = lab.get_by_text(re.compile(r"^Elapsed: " + str(month) + r" of 12 reference months"))
            expect(value).to_be_visible()
            return value

        def choices(labels, selected=None):
            for label in labels:
                expect(button(label)).to_have_attribute("aria-pressed", "true" if label == selected else "false")

        radii = ["0.5 AU", "1 AU", "1.5 AU", "2 AU"]
        predictions = ["Less time", "Same time", "More time"]
        choices(radii, "2 AU")
        choices(predictions)
        state(0)
        expect(button("Back one month")).to_be_disabled()
        expect(button("Reset time")).to_be_disabled()
        expect(button("Advance one month")).to_be_enabled()
        for label in ("Back one month", "Advance one month", "Reset time"):
            assert button(label).get_attribute("aria-pressed") is None, label

        image = lab.get_by_role("img", name=re.compile(r"^Two circular orbits at 2 and 1 astronomical unit\."))
        expect(image).to_be_visible()
        expect(image).to_have_attribute("aria-label", re.compile(r"Time 0\.00 reference years\.$"))
        expect(lab.get_by_text("directions only", exact=False)).to_be_visible()
        expect(lab.get_by_text("not drawn to scale", exact=False)).to_be_visible()

        if not touch:
            button("0.5 AU").focus()
            page.keyboard.press("Tab")
            expect(button("1 AU")).to_be_focused()
            button("1 AU").press("Space")
            choices(radii, "1 AU")

        # Each distance changes the model, clears previous time/prediction, and
        # produces feedback after the learner makes a prediction and advances.
        for radius, prediction, period in (
            ("0.5", "Less time", "0.35"),
            ("1", "Same time", "1.00"),
            ("1.5", "More time", "1.84"),
            ("2", "More time", "2.83"),
        ):
            activate(button(radius + " AU"))
            choices(radii, radius + " AU")
            choices(predictions)
            state(0)
            expect(button("Back one month")).to_be_disabled()
            expect(button("Reset time")).to_be_disabled()
            expect(lab.get_by_text("Your prediction matches this model.", exact=False)).to_have_count(0)
            activate(button(prediction), key="Space")
            choices(predictions, prediction)
            activate(button("Advance one month"))
            state(1)
            expect(lab.get_by_text("Your prediction matches this model.", exact=False)).to_be_visible()
            expect(lab.get_by_text(f"One full orbit takes {period} reference years.", exact=False)).to_be_visible()
            expect(lab.get_by_role("img")).to_have_attribute(
                "aria-label", re.compile(r"Time 0\.08 reference years\.$")
            )

        activate(button("Less time"))
        expect(lab.get_by_text("Compare the two orbital periods and try another prediction.", exact=False)).to_be_visible()
        activate(button("More time"))
        expect(lab.get_by_text("Your prediction matches this model.", exact=False)).to_be_visible()
        for month in range(2, 13):
            activate(button("Advance one month"))
            state(month)
        expect(state(12)).to_contain_text("Reference: 1.00 orbits")
        expect(state(12)).to_contain_text("Your planet: 0.35 orbits")
        expect(button("Advance one month")).to_be_disabled()
        expect(button("Back one month")).to_be_enabled()
        expect(button("Reset time")).to_be_enabled()
        expect(lab.get_by_role("img")).to_have_attribute(
            "aria-label", re.compile(r"Time 1\.00 reference years\.$")
        )

        layout = lab.evaluate("""panel => {
            const bounds = panel.getBoundingClientRect();
            return {
                viewport: document.documentElement.clientWidth,
                left: bounds.left, right: bounds.right,
                overflow: panel.scrollWidth - panel.clientWidth,
                targets: [...panel.querySelectorAll('[role="button"]')].map(button => {
                    const r = button.getBoundingClientRect();
                    return {label: button.textContent, width: r.width, height: r.height,
                            left: r.left, right: r.right};
                }),
                svg: (() => { const r = panel.querySelector('svg').getBoundingClientRect();
                             return {left: r.left, right: r.right, width: r.width, height: r.height}; })()
            };
        }""")
        assert layout["left"] >= -1 and layout["right"] <= layout["viewport"] + 1, layout
        assert layout["overflow"] <= 1, layout
        for target in layout["targets"]:
            assert target["width"] >= 44 and target["height"] >= 44, target
            assert target["left"] >= layout["left"] - 1 and target["right"] <= layout["right"] + 1, target
        assert layout["svg"]["width"] > 0 and layout["svg"]["height"] > 0, layout
        assert layout["svg"]["left"] >= layout["left"] - 1 and layout["svg"]["right"] <= layout["right"] + 1, layout
        if os.environ.get("QA_SCREENSHOTS"):
            destination = Path(os.environ["QA_SCREENSHOTS"])
            destination.mkdir(parents=True, exist_ok=True)
            # The lab is taller than the phone's nested ScrollView viewport.
            # Capture what a learner actually sees at the original viewport
            # size, instead of an element screenshot clipped by its scroller.
            heading.evaluate("node => node.scrollIntoView({block: 'start', inline: 'nearest', behavior: 'instant'})")
            page.screenshot(path=str(destination / f"orbit-{name}-controls.png"), full_page=False)
            summary = lab.get_by_text("One full orbit takes 2.83 reference years.", exact=False)
            summary.evaluate("node => node.scrollIntoView({block: 'center', inline: 'nearest', behavior: 'instant'})")
            page.screenshot(path=str(destination / f"orbit-{name}-results.png"), full_page=False)

        activate(button("Back one month"))
        state(11)
        expect(button("Advance one month")).to_be_enabled()
        activate(button("Reset time"))
        state(0)
        expect(button("Back one month")).to_be_disabled()
        expect(button("Reset time")).to_be_disabled()
        choices(predictions, "More time")
        assert not errors, errors
        print(json.dumps({"viewport": name, "width": width, "interaction": "touch" if touch else "keyboard",
                          "result": "PASS", "checks": "guest browsing, choice states, predictions, model updates, month bounds, reset, image name, target size and overflow",
                          "external_requests_blocked": len(blocked_requests)}), flush=True)
    finally:
        context.close()


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=os.environ.get("QA_CHROMIUM", "/usr/bin/chromium"),
            args=["--no-sandbox"],
        )
        try:
            for config in (("desktop", 1280, False), ("phone", 390, True), ("narrow", 320, True)):
                exercise(browser, *config)
        finally:
            browser.close()
finally:
    server.shutdown()
    server.server_close()
