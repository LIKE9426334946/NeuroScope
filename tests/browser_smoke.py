"""Exercise the deployed application through Nginx in Chromium."""
import io
import os
import re

from PIL import Image
from playwright.sync_api import expect, sync_playwright

URL = os.getenv("NEUROSCOPE_URL", "http://127.0.0.1:16010")


def next_frame(page):
    page.evaluate("() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))")


def label_center(page, index):
    label = page.locator(".sphere-label").filter(has_text=re.compile(rf"^#{index}$"))
    expect(label).to_be_visible()
    next_frame(page)
    box = label.bounding_box()
    return box["x"] + box["width"] / 2, box["y"] + box["height"] / 2


def button(page, name):
    return page.get_by_role("button", name=name, exact=True)


def detail(page, name):
    return page.locator(".properties > div").filter(has=page.get_by_text(name, exact=True)).locator("dd")


def select_index(page, index):
    page.get_by_label("按编号选择", exact=True).fill(str(index))
    button(page, "选择此编号").click()
    expect(detail(page, "神经元编号")).to_have_text(f"#{index}")


def reshape(page, shape):
    button(page, "调整输入 Shape").click()
    page.get_by_label("输入 Shape", exact=True).fill(shape)
    button(page, "应用 Shape").click()


def verify_default(page):
    select_index(page, 12)
    expect(detail(page, "多维索引")).to_have_text("[0, 2, 2]")
    expect(detail(page, "下一层影响数")).to_have_text("72")
    button(page, "下一层").click()
    expect(page.locator(".scene-hud")).to_contain_text("[8, 3, 3]")
    expect(detail(page, "当前关联数")).to_have_text("72")
    expect(detail(page, "所选层")).to_have_text("Layer 01")

    select_index(page, 4)
    expect(detail(page, "多维索引")).to_have_text("[0, 1, 1]")
    button(page, "上一层").click()
    expect(page.locator(".scene-hud")).to_contain_text("[3, 5, 5]")
    expect(detail(page, "所选层")).to_have_text("Layer 02")
    expect(detail(page, "上一层依赖数")).to_have_text("27")
    expect(detail(page, "当前关联数")).to_have_text("27")
    expect(detail(page, "当前运算")).to_have_text("Conv2D")


def verify_editor(page):
    button(page, "添加 Conv2D").click()
    expect(page.locator("#conv-in_channels")).to_have_value("8")
    expect(page.locator("#conv-in_channels")).not_to_be_editable()
    page.locator("#conv-out_channels").fill("4")
    page.locator("#conv-kernel_size").fill("1")
    page.locator("#conv-groups").fill("3")
    expect(page.get_by_role("alert")).to_contain_text("整除")
    expect(button(page, "生成输出层")).to_be_disabled()
    page.locator("#conv-groups").fill("2")
    expect(page.locator(".shape-preview")).to_contain_text("[4, 3, 3]")
    button(page, "生成输出层").click()
    expect(page.locator(".scene-hud")).to_contain_text("Layer 03")
    page.get_by_role("button", name=re.compile("Layer 02")).click()
    select_index(page, 4)
    expect(detail(page, "上一层依赖数")).to_have_text("27")
    expect(detail(page, "下一层影响数")).to_have_text("2")
    button(page, "上一层").click()
    button(page, "下一层").click()
    expect(page.locator(".related-chips button")).to_have_text(["#4", "#13"])
    expect(detail(page, "所选层")).to_have_text("Layer 02")
    button(page, "返回所选层").click()
    expect(detail(page, "观察方向")).to_have_text("当前层")

    reshape(page, "1, 2")
    expect(page.get_by_role("alert")).to_contain_text("三维输入")
    button(page, "取消").click()
    expect(detail(page, "神经元编号")).to_have_text("#4")
    reshape(page, "3, 6, 5")
    expect(page.locator(".layer-row code")).to_have_text(["[3, 6, 5]", "[8, 4, 3]", "[4, 4, 3]"])
    button(page, "移除末尾运算").click()
    button(page, "移除末尾运算").click()
    for text, expected in [("5", "[5]"), ("4,5", "[4, 5]")]:
        reshape(page, text)
        expect(page.locator(".scene-hud")).to_contain_text(expected)
        expect(button(page, "添加 Conv2D")).to_be_disabled()


def verify_picking_and_colours(page):
    # A one-row spatial slice avoids occlusion, so every ball can be sampled.
    reshape(page, "1, 1, 5")
    button(page, "添加 Conv2D").click()
    page.locator("#conv-out_channels").fill("1")
    page.locator("#conv-kernel_size").fill("1,3")
    expect(page.locator(".shape-preview")).to_contain_text("[1, 1, 3]")
    button(page, "生成输出层").click()
    button(page, "编号").click()
    expect(page.locator(".sphere-label")).to_have_count(3)
    page.mouse.click(*label_center(page, 1))
    expect(detail(page, "多维索引")).to_have_text("[0, 0, 1]")
    button(page, "上一层").click()
    expect(page.locator(".related-chips button")).to_have_text(["#1", "#2", "#3"])
    expect(page.locator(".sphere-label")).to_have_count(5)
    centers = [label_center(page, i) for i in range(5)]
    image = Image.open(io.BytesIO(page.screenshot())).convert("RGB")
    for i, (x, y) in enumerate(centers):
        r, _, b = image.getpixel((round(x + 9), round(y + 6)))
        assert (b - r > 35) == (i in {1, 2, 3}), (i, r, b)
    page.mouse.click(*centers[2])
    expect(detail(page, "神经元编号")).to_have_text("#2")
    next_frame(page)
    image = Image.open(io.BytesIO(page.screenshot())).convert("RGB")
    x, y = label_center(page, 2)
    r, g, b = image.getpixel((round(x + 9), round(y + 6)))
    assert g - r > 30 and g > b, (r, g, b)
    # Focus an off-centre point to verify actual camera movement.
    page.mouse.dblclick(*label_center(page, 1))
    canvas = page.locator(".stage canvas").bounding_box()
    x, y = label_center(page, 1)
    assert abs(x - (canvas["x"] + canvas["width"] / 2)) < 5
    assert abs(y - (canvas["y"] + canvas["height"] / 2)) < 6
    button(page, "重置视角").click()
    button(page, "重置选择").click()
    expect(page.get_by_text("尚未选择神经元")).to_be_visible()
    expect(button(page, "下一层")).to_be_disabled()


def verify_webgl(page):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    assert page.request.get(f"{URL}/api/health").json() == {"status": "ok", "service": "NeuroScope"}
    network = page.request.get(f"{URL}/api/network").json()
    assert network["input_shape"] == [3, 5, 5]
    assert network["operations"][0]["type"] == "Conv2D"
    assert network["layers"][1]["shape"] == [8, 3, 3]
    assert "/api/network" in page.request.get(f"{URL}/api/openapi.json").json()["paths"]
    assert page.request.get(f"{URL}/api/missing").status == 404
    assert page.request.get(f"{URL}/assets/missing.js").status == 404
    page.goto(URL)
    expect(page.locator(".header-status")).to_contain_text("服务器计算图")
    expect(page.locator("canvas[data-engine^='three.js']")).to_be_visible()
    stage = page.locator(".stage").bounding_box()
    verify_default(page)
    assert abs(page.locator(".stage").bounding_box()["height"] - stage["height"]) < 1
    verify_editor(page)
    verify_picking_and_colours(page)
    assert not errors, errors


if __name__ == "__main__":
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        try:
            verify_webgl(browser.new_page(viewport={"width": 1440, "height": 900}))
        finally:
            browser.close()
        browser = playwright.chromium.launch(args=["--disable-webgl"])
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.route("**/api/network", lambda route: route.fulfill(status=503, body="unavailable"))
            page.goto(URL)
            expect(page.locator(".header-status")).to_contain_text("内置计算图")
            expect(page.locator("canvas.projection-canvas")).to_be_visible()
            verify_default(page)
        finally:
            browser.close()
        print("PASS: production API, graph editing, bidirectional counts, white/blue/green WebGL pixels, focus, and software rendering.")
