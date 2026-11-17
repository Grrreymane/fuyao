"""Real input paths for the v3 actions: touch double-tap, second-finger tap, mouse click, Space, E and the 化 seal."""
import os
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "debug.html")
errs, fails = [], []


def check(name, cond, info):
    print(("ok  " if cond else "FAIL"), name, {k: info[k] for k in ("state", "cd", "wind", "vortex", "birds")}, flush=True)
    if not cond:
        fails.append(name)


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    # phone
    c = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = c.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL)
    time.sleep(1.2)
    pg.touchscreen.tap(195, 420)
    time.sleep(3.6)
    pg.evaluate("window.__fy.birds(60)")
    cdp = c.new_cdp_session(pg)
    info = lambda: pg.evaluate("window.__fy.info()")
    # a single tap must not fire the wing beat
    pg.touchscreen.tap(200, 600)
    time.sleep(0.4)
    check("single tap does nothing", info()["cd"] == 0, info())
    # double tap
    for k in range(2):
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": 200, "y": 600}]})
        time.sleep(0.05)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        time.sleep(0.09)
    time.sleep(0.1)
    check("double tap -> wing", info()["cd"] > 2.5, info())
    time.sleep(3.9)  # longer than the wing cooldown (3.6 s)
    # drag with one finger, tap with a second
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": 200, "y": 650, "id": 1}]})
    for k in range(6):
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": 200 - 6 * k, "y": 650 - 4 * k, "id": 1}]})
        time.sleep(0.03)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": 170, "y": 630, "id": 1}, {"x": 320, "y": 500, "id": 2}]})
    time.sleep(0.05)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": [{"x": 170, "y": 630, "id": 1}]})
    time.sleep(0.05)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    time.sleep(0.1)
    check("second finger -> wing", info()["cd"] > 2.5, info())
    # the seal appears when the wind is full and a tap on it transforms
    pg.evaluate("window.__fy.ev('full')")
    time.sleep(0.6)
    vis = pg.evaluate("getComputedStyle(document.getElementById('bFy')).opacity")
    box = pg.evaluate("(() => { const r = document.getElementById('bFy').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()")
    pg.touchscreen.tap(box[0], box[1])
    time.sleep(0.3)
    check("tap 扶 seal -> whirlwind (seal opacity %s)" % vis, info()["vortex"] is True, info())
    c.close()
    # desktop
    c = b.new_context(viewport={"width": 1280, "height": 800}, device_scale_factor=1)
    pg = c.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL)
    time.sleep(1.2)
    pg.mouse.click(640, 400)
    time.sleep(3.6)
    pg.evaluate("window.__fy.birds(60)")
    info = lambda: pg.evaluate("window.__fy.info()")
    pg.mouse.move(600, 300)
    pg.mouse.click(600, 300)
    time.sleep(0.1)
    check("click -> wing", info()["cd"] > 2.5, info())
    time.sleep(3.9)  # longer than the wing cooldown (3.6 s)
    pg.keyboard.press(" ")
    time.sleep(0.1)
    check("space -> wing", info()["cd"] > 2.5, info())
    pg.keyboard.press("e")
    time.sleep(0.1)
    check("E without wind does nothing", info()["vortex"] is False, info())
    pg.evaluate("window.__fy.ev('full')")
    pg.keyboard.press("e")
    time.sleep(0.2)
    check("E with full wind -> whirlwind", info()["vortex"] is True, info())
    b.close()
print("errors", errs or "none", "| failures", fails or "none")
