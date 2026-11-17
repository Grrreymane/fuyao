"""Trigger hawk, lightning, game over, restart and pause; capture screenshots; also check desktop."""
import os
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "debug.html")
SH = os.path.join(ROOT, "shots")
desk = len(sys.argv) > 1 and sys.argv[1] == "desktop"
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    if desk:
        c = b.new_context(viewport={"width": 1366, "height": 820}, device_scale_factor=1)
    else:
        c = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = c.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    tag = "desk" if desk else "ph"
    pg.goto(URL)
    time.sleep(2)
    pg.screenshot(path=os.path.join(SH, f"ev_{tag}_title.png"))
    pg.evaluate("window.__fy.start()")
    time.sleep(3.5)
    if desk:
        pg.mouse.move(600, 400)
        time.sleep(0.5)
        pg.mouse.move(800, 300)
    pg.evaluate("window.__fy.birds(120)")
    pg.evaluate("window.__fy.jump(16200)")
    time.sleep(1.5)
    pg.evaluate("window.__fy.ev('hawk')")
    for k in range(6):
        time.sleep(0.9)
        st = pg.evaluate("window.__fy.info()")
        pg.screenshot(path=os.path.join(SH, f"ev_{tag}_hawk{k}.png"))
    print("after hawk", st)
    pg.evaluate("window.__fy.jump(21200)")
    time.sleep(1.2)
    pg.evaluate("window.__fy.ev('bolt')")
    time.sleep(0.6)
    pg.screenshot(path=os.path.join(SH, f"ev_{tag}_boltwarn.png"))
    time.sleep(0.55)
    pg.screenshot(path=os.path.join(SH, f"ev_{tag}_bolt.png"))
    print("after bolt", pg.evaluate("window.__fy.info()"))
    pg.evaluate("window.__fy.ev('wipe')")
    time.sleep(3.2)
    pg.screenshot(path=os.path.join(SH, f"ev_{tag}_over.png"))
    print("over", pg.evaluate("window.__fy.info()"))
    pg.click("#again")
    time.sleep(3.0)
    print("restart", pg.evaluate("window.__fy.info()"))
    pg.click("#bPau")
    time.sleep(1.2)
    pg.screenshot(path=os.path.join(SH, f"ev_{tag}_pause.png"))
    print("paused", pg.evaluate("window.__fy.info()"))
    pg.click("#resume")
    time.sleep(1.0)
    print("resumed", pg.evaluate("window.__fy.info()"))
    b.close()
print("errors:", errs or "none")
