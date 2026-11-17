"""Smoke-test the game in headless Chrome at a phone viewport and save screenshots."""
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "debug.html")
SHOTS = os.path.join(ROOT, "shots")
os.makedirs(SHOTS, exist_ok=True)

mode = sys.argv[1] if len(sys.argv) > 1 else "basic"
logs = []


def shot(page, name):
    page.screenshot(path=os.path.join(SHOTS, name + ".png"))


def info(page):
    return page.evaluate("window.__fy && window.__fy.info()")


def drag(cdp, x0, y0, x1, y1, steps=12):
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x0, "y": y0}]})
    for k in range(1, steps + 1):
        x = x0 + (x1 - x0) * k / steps
        y = y0 + (y1 - y0) * k / steps
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y}]})
        time.sleep(0.03)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--autoplay-policy=no-user-gesture-required", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    vw, vh = (390, 844) if mode != "desktop" else (1366, 820)
    ctx = browser.new_context(viewport={"width": vw, "height": vh}, device_scale_factor=3 if mode != "desktop" else 1, is_mobile=mode != "desktop", has_touch=mode != "desktop")
    page = ctx.new_page()
    page.on("console", lambda m: logs.append(f"[{m.type}] {m.text}"))
    page.on("pageerror", lambda e: logs.append(f"[pageerror] {e}"))
    page.goto(URL)
    time.sleep(2.0)
    shot(page, f"{mode}_00_title")
    print("title", info(page))
    if mode == "desktop":
        page.mouse.click(vw / 2, vh / 2)
    else:
        page.touchscreen.tap(vw / 2, vh / 2)
    time.sleep(0.9)
    shot(page, f"{mode}_01_intro")
    time.sleep(2.2)
    shot(page, f"{mode}_02_play")
    print("play", info(page))
    cdp = ctx.new_cdp_session(page)
    if mode != "desktop":
        drag(cdp, 200, 600, 120, 520)
        time.sleep(1.0)
        drag(cdp, 120, 600, 260, 560)
    time.sleep(2.0)
    shot(page, f"{mode}_03_play")
    print("play2", info(page))
    if mode in ("stages", "desktop"):
        page.evaluate("window.__fy.birds(180)")
        for si in range(9):
            alt = si * 5000 + 1200
            page.evaluate(f"window.__fy.jump({alt})")
            time.sleep(2.6)
            shot(page, f"{mode}_s{si + 1}")
            print("stage", si + 1, info(page))
    if mode == "finale":
        page.evaluate("window.__fy.birds(200)")
        page.evaluate("window.__fy.jump(44200)")
        for k in range(10):
            time.sleep(2.0)
            shot(page, f"{mode}_f{k:02d}")
            print("fin", k, info(page))
    if mode == "over":
        # steer the flock into the cliff wall until it is gone
        for k in range(30):
            page.evaluate("(()=>{})()")
            drag(cdp, 200, 600, 30, 300, steps=6)
            st = info(page)
            if st and st["state"] in ("over", "dying"):
                break
        time.sleep(3)
        shot(page, f"{mode}_gameover")
        print("over", info(page))
    browser.close()

print("\n".join(logs[-40:]) or "no console output")
