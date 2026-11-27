"""Check center companions in the exported island with synthetic guest progress."""
import os
from datetime import datetime, timezone

from playwright.sync_api import sync_playwright

from browser_export import exported_site


# Observe the real Three.js scene through its development-tools event.
SETUP = """
window.__THREE_DEVTOOLS__ = new EventTarget();
__THREE_DEVTOOLS__.addEventListener('observe', event => {
  if (event.detail.isScene) window.islandScene = event.detail;
});
localStorage.setItem('@nova/companion.friendship.v1/guest', JSON.stringify({
  'companion:star_throw': 120, 'companion:party_3d': 120, 'companion:party_3d_2': 120
}));
localStorage.setItem('@nova/islandGuide.v2:guest','seen');
localStorage.setItem('@nova/dailyGreeting.v1:guest',new Date().toLocaleDateString('sv-SE'));
"""
POSES = """
() => {
  const samples = [];
  window.islandScene?.traverse(mesh => {
    if (!mesh.material?.vertexColors || mesh.material.roughness !== 0.6 ||
        !mesh.parent.children.some(child => child.position.y === 1.075)) return;
    const figure = mesh.parent.parent;
    samples.push([figure.uuid, figure.matrixWorld.elements.slice(),
      figure.children.map(prop => [prop.position.toArray(), prop.rotation.toArray(), prop.visible])]);
  });
  return samples;
}
"""


def exercise(browser, origin, reduced):
    context = browser.new_context(
        viewport={"width": 390 if reduced else 1100, "height": 844},
        reduced_motion="reduce" if reduced else "no-preference",
        has_touch=reduced, is_mobile=reduced, timezone_id="America/New_York",
        service_workers="block",
    )
    try:
        context.route("**/*", lambda r: r.continue_() if
                      r.request.url.startswith(origin + "/") and r.request.method in ("GET", "HEAD")
                      else r.abort())
        context.route_web_socket("**/*", lambda ws: ws.close())
        context.add_init_script(SETUP)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.clock.set_fixed_time(datetime(2026, 11, 27, 3 if reduced else 17, tzinfo=timezone.utc))
        page.goto(origin + "/island")
        page.wait_for_function(f"({POSES})().length === 3", timeout=90000)
        page.wait_for_timeout(750)
        frames = []
        for _ in range(9):
            frames.append(page.evaluate(POSES))
            page.wait_for_timeout(150)
        assert all(len(frame) == 3 for frame in frames)
        for index in range(3):
            samples = [frame[index] for frame in frames]
            assert len({sample[0] for sample in samples}) == 1, "Companion remounted during sample"
            moved = any(sample[1:] != samples[0][1:] for sample in samples[1:])
            assert moved != reduced, (index, reduced, moved)
        assert not errors, errors
        print(f"PASS: three companions, reduced motion={reduced}", flush=True)
    finally:
        context.close()


if __name__ == "__main__":
    with exported_site() as origin, sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=os.environ["QA_CHROMIUM"],
            args=["--no-sandbox", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
        )
        try:
            for reduced in (False, True):
                exercise(browser, origin, reduced)
        finally:
            browser.close()
