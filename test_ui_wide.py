"""New screens on desktop (1280x800) and a landscape phone (844x390): title links, game-over sheet with continue,
the 寓言卷 and the result card. Saves shots/ui_<w>_<name>.png."""
import os
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "debug.html")
SH = os.path.join(ROOT, "shots")
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    for w, h, mobile in [(1280, 800, False), (844, 390, True)]:
        c = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1 if not mobile else 2, is_mobile=mobile, has_touch=mobile)
        pg = c.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
        pg.goto(URL)
        time.sleep(1.4)
        pg.screenshot(path=os.path.join(SH, f"ui_{w}_title.png"))
        pg.evaluate("document.getElementById('bScroll').click()")
        time.sleep(1.1)
        pg.screenshot(path=os.path.join(SH, f"ui_{w}_scroll.png"))
        pg.evaluate("document.getElementById('scrollClose').click()")
        time.sleep(0.4)
        pg.evaluate("window.__fy.start()")
        time.sleep(3.4)
        pg.evaluate("window.__fy.birds(80)")
        pg.evaluate("window.__fy.jump(21500)")
        time.sleep(1.4)
        pg.evaluate("window.__fy.ev('wipe')")
        time.sleep(3.5)
        pg.screenshot(path=os.path.join(SH, f"ui_{w}_over.png"))
        pg.evaluate("document.getElementById('oCard').click()")
        time.sleep(1.0)
        pg.screenshot(path=os.path.join(SH, f"ui_{w}_card.png"))
        pg.evaluate("document.getElementById('shareClose').click()")
        pg.evaluate("document.getElementById('again').click()")
        time.sleep(3.5)
        pg.evaluate("window.__fy.birds(150)")
        pg.evaluate("window.__fy.jump(44500)")
        time.sleep(24)
        pg.screenshot(path=os.path.join(SH, f"ui_{w}_win.png"))
        c.close()
    b.close()
print("errors", errs or "none")
