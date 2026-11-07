"""Two separate browser profiles exercise the actual live display API and UI."""
import os
from contextlib import contextmanager
from pathlib import Path

from playwright.sync_api import expect


@contextmanager
def temporary_presentation(request, url):
    endpoint = url + "/api/presentation"
    original = request.get(endpoint).json()

    def restore(snapshot):
        current = request.get(endpoint).json()
        res = request.put(endpoint, data={**snapshot, "editorRevision": current["editorRevision"]})
        assert res.ok, res.text()
        after = res.json()
        shapes = {layer["id"]: layer["shape"] for layer in after["network"]["layers"]}
        existing = {(p["layer"], p["index"]) for p in after["pins"]}
        desired = {(p["layer"], p["index"]) for p in snapshot["pins"]}
        for pins, enabled in [(existing - desired, False), (desired - existing, True)]:
            for layer, index in pins:
                res = request.post(endpoint + "/pins", data={"layer": layer, "shape": shapes[layer], "indices": [index], "pinned": enabled})
                assert res.ok, res.text()

    try:
        preset = request.get(url + "/api/network").json()
        restore({**original, "network": preset, "visible": 1, "selected": None, "direction": "self", "pins": []})
        yield
    finally:
        restore(original)


def verify_display(browser, url):
    admin_context = browser.new_context(viewport={"width": 1440, "height": 940})
    viewer_context = browser.new_context(viewport={"width": 1440, "height": 940})
    admin = admin_context.new_page()
    home = viewer_context.new_page()
    errors = []
    for page in (admin, home):
        page.on("pageerror", lambda error: errors.append(str(error)))
    def select(index):
        admin.get_by_label("按编号选择", exact=True).fill(str(index))
        admin.get_by_role("button", name="选择此编号").click()

    def pin(layer, index):
        return home.locator(f'[data-item="node-{layer}-{index}"]')

    def tone(layer, index, value):
        expect(pin(layer, index)).to_have_attribute("data-tone", value)

    def click_admin(name):
        admin.get_by_role("button", name=name, exact=True).click()

    def drag(handle, dx, dy):
        handle.scroll_into_view_if_needed()
        box = handle.bounding_box()
        x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        home.mouse.move(x, y)
        home.mouse.down()
        home.mouse.move(x + dx, y + dy, steps=8)
        home.mouse.up()

    try:
        admin.goto(url + "/admin/")
        home.goto(url)
        expect(admin.get_by_role("heading", name="拓扑探索器")).to_be_visible()
        expect(home.locator(".workbench")).to_have_count(0)
        expect(home.locator(".layer-item")).to_have_count(2)
        select(12)
        click_admin("固定到首页")
        tone(1, 12, "selected")
        click_admin("下一层")
        expect(home.locator('[data-item="layer-2"] [role="group"]')).to_have_attribute("aria-label", "关联神经元 72 个")
        home.get_by_role("button", name="选择神经元").click()
        home.get_by_label("网络层", exact=True).select_option("2")
        home.get_by_label("神经元编号", exact=True).fill("0,4")
        home.get_by_role("button", name="添加", exact=True).click()
        tone(2, 0, "related")
        tone(2, 4, "related")
        home.get_by_label("网络层", exact=True).select_option("1")
        home.get_by_label("神经元编号", exact=True).fill("0")
        home.get_by_role("button", name="添加", exact=True).click()
        tone(1, 0, "normal")
        home.get_by_label("关闭选择面板").click()

        first_box = pin(1, 12).bounding_box()
        drag(pin(1, 12).locator(".pin-grab"), 67, 21)
        moved = pin(1, 12).bounding_box()
        assert abs(moved["x"] - first_box["x"] - 67) < 2
        assert abs(moved["y"] - first_box["y"] - 21) < 2
        home.mouse.move(moved["x"] + 30, moved["y"] + 30)
        home.mouse.wheel(0, -120)
        home.wait_for_function("(w) => document.querySelector('[data-item=node-1-12]').getBoundingClientRect().width > w+5", arg=moved["width"])
        scaled = pin(1, 12).bounding_box()
        scaled_top = pin(1, 12).evaluate("el => el.offsetTop")
        layer_card = home.locator('[data-item="layer-1"]')
        layer_box = layer_card.bounding_box()
        drag(layer_card.locator(".board-grab"), 36, 15)
        assert abs(layer_card.bounding_box()["x"] - layer_box["x"] - 36) < 2
        layer_card.get_by_label("缩放 Layer 01").focus()
        home.keyboard.press("+")
        assert layer_card.bounding_box()["width"] > layer_box["width"]

        admin.locator(".layer-row").first.click()
        select(0)
        click_admin("下一层")
        tone(1, 0, "selected")
        tone(1, 12, "normal")
        tone(2, 0, "related")
        tone(2, 4, "normal")
        select(4)
        click_admin("上一层")
        tone(2, 4, "selected")
        tone(1, 12, "related")
        tone(1, 0, "normal")
        expect(home.locator(".display-state")).to_contain_text("27")
        home.reload()
        tone(1, 12, "related")
        persisted = pin(1, 12).bounding_box()
        for key in ("x", "width", "height"):
            assert abs(persisted[key] - scaled[key]) < 2, (key, persisted, scaled)
        assert abs(pin(1, 12).evaluate("el => el.offsetTop") - scaled_top) < 2
        admin.reload()
        expect(admin.locator(".anchor-card")).to_contain_text("Neuron #4")
        if os.getenv("NEUROSCOPE_SCREENSHOTS"):
            dest = Path(os.environ["NEUROSCOPE_SCREENSHOTS"])
            dest.mkdir(parents=True, exist_ok=True)
            home.get_by_label("整理画布位置").click()
            home.evaluate("window.scrollTo(0,0)")
            home.screenshot(path=dest / "display.png", full_page=True)

        click_admin("重置选择")
        tone(1, 12, "normal")
        tone(2, 4, "normal")
        click_admin("添加 Conv2D")
        admin.locator("#conv-kernel_size").fill("1")
        click_admin("生成输出层")
        expect(home.locator('[data-item="layer-3"]')).to_be_visible()
        click_admin("移除末尾运算")
        expect(home.locator('[data-item="layer-3"]')).to_have_count(0)
        click_admin("调整输入 Shape")
        admin.get_by_label("输入 Shape", exact=True).fill("3,6,5")
        click_admin("应用 Shape")
        expect(home.locator('[data-item="layer-1"] .board-grab')).to_contain_text("[3, 6, 5]")
        expect(home.locator(".node-item")).to_have_count(0)
        click_admin("移除末尾运算")
        click_admin("调整输入 Shape")
        admin.get_by_label("输入 Shape", exact=True).fill("1,1,5")
        click_admin("应用 Shape")
        expect(home.locator('[data-item="layer-1"] .board-grab')).to_contain_text("[1, 1, 5]")
        canvas = home.locator('[data-item="layer-1"] canvas')
        canvas.scroll_into_view_if_needed()
        box = canvas.bounding_box()
        home.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        tone(1, 2, "normal")
        home.get_by_role("button",name="选择神经元").click()
        home.get_by_label("移除 Layer 01 #2",exact=True).click()
        expect(pin(1, 2)).to_have_count(0)
        assert not errors, errors
    finally:
        viewer_context.close()
        admin_context.close()
