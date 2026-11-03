"""Exercise the shipped WebGL renderer through the production Nginx URL."""
import io
import os
import re

from PIL import Image
from playwright.sync_api import expect, sync_playwright


def next_frame(page):
    page.evaluate("() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))")


def label_center(page, index):
    label = page.locator(".sphere-label").filter(has_text=re.compile(rf"^#{index}$"))
    expect(label).to_be_visible()
    next_frame(page)
    box = label.bounding_box()
    return box["x"] + box["width"] / 2, box["y"] + box["height"] / 2


def verify(page):
    errors = []
    def report_error(error):
        print(f"Page error: {error}", flush=True)
        errors.append(str(error))

    page.on("pageerror", report_error)
    url = os.getenv("NEUROSCOPE_URL", "http://127.0.0.1:16010")
    assert page.request.get(f"{url}/api/health").json() == {"status": "ok", "service": "NeuroScope"}
    assert "/api/network" in page.request.get(f"{url}/api/openapi.json").json()["paths"]
    assert page.request.get(f"{url}/api/missing").status == 404
    assert page.request.get(f"{url}/assets/missing.js").status == 404
    page.goto(url)
    expect(page.locator(".header-status")).to_contain_text("服务器模拟网络")
    expect(page.locator("canvas[data-engine^='three.js']")).to_be_visible()
    page.get_by_role("button", name=re.compile("Layer 02")).click()
    page.get_by_role("button", name="编号", exact=True).click()
    expect(page.locator(".sphere-label")).to_have_count(16)
    page.mouse.click(*label_center(page, 5))
    expect(page.locator(".anchor-card")).to_contain_text("Neuron #5")
    expect(page.locator(".properties")).to_contain_text("[1, 1]")

    page.get_by_role("button", name="上一层", exact=True).click()
    expect(page.locator(".scene-hud")).to_contain_text("Layer 01")
    expect(page.locator(".related-chips button")).to_have_count(3)
    expect(page.locator(".sphere-label")).to_have_count(5)
    centers = [label_center(page, n) for n in range(5)]
    # Sample away from the printed index, within the sphere. Check all five.
    image = Image.open(io.BytesIO(page.screenshot())).convert("RGB")
    for index, (x, y) in enumerate(centers):
        r, _, b = image.getpixel((round(x + 9), round(y + 6)))
        assert (b - r > 35) == (index in {0, 1, 3}), (index, r, b)

    page.get_by_role("button", name="下一层", exact=True).click()
    expect(page.locator(".scene-hud")).to_contain_text("Layer 03")
    expect(page.locator(".related-chips button")).to_have_text(["#8", "#9", "#10", "#11"])
    expect(page.locator(".anchor-card")).to_contain_text("Layer 02")
    page.get_by_role("button", name="返回所选层").click()
    expect(page.locator(".sphere-label")).to_have_count(16)
    page.mouse.dblclick(*label_center(page, 5))
    canvas = page.locator(".stage canvas").bounding_box()
    x, y = label_center(page, 5)
    assert abs(x - (canvas["x"] + canvas["width"] / 2)) < 5
    assert abs(y - (canvas["y"] + canvas["height"] / 2)) < 6
    page.get_by_role("button", name="重置视角").click()
    page.get_by_role("button", name="重置选择").click()
    expect(page.get_by_text("尚未选择神经元")).to_be_visible()
    expect(page.get_by_role("button", name="上一层", exact=True)).to_be_disabled()
    assert not errors, errors


if __name__ == "__main__":
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(args=[
            "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
        ])
        try:
            verify(browser.new_page(viewport={"width": 1440, "height": 900}))
            print("WebGL selection, every upstream colour, direction switching, focus and resets passed.")
        finally:
            browser.close()
