"""v3 mechanics on a phone viewport: wind ring, wing beat (arrow formation), the mid-flight whirlwind smashing a bridge.
Saves shots/v3_*.png and shots/sheet_v3.png."""
import os
import time

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "debug.html")
SH = os.path.join(ROOT, "shots")
errs, files = [], []


def snap(pg, name):
    f = os.path.join(SH, f"v3_{name}.png")
    pg.screenshot(path=f)
    files.append(f)
    print(f"{name:12s}", pg.evaluate("window.__fy.info()"), flush=True)


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    c = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = c.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto(URL)
    time.sleep(1.2)
    pg.evaluate("window.__fy.start()")
    time.sleep(3.4)
    pg.evaluate("window.__fy.birds(120)")
    pg.evaluate("window.__fy.ev('wind')")
    time.sleep(1.0)
    snap(pg, "ring")
    pg.evaluate("window.__fy.ev('wing')")
    time.sleep(0.22)
    snap(pg, "wing")
    time.sleep(0.6)
    snap(pg, "wing_after")
    # the whirlwind over the broken bridges of the third heaven
    pg.evaluate("window.__fy.jump(11400)")
    time.sleep(1.2)
    pg.evaluate("window.__fy.ev('full')")
    time.sleep(0.6)
    snap(pg, "ready")
    pg.evaluate("document.getElementById('bFy').click()")
    for k, dt in enumerate([0.6, 1.6, 2.0, 2.4]):
        time.sleep(dt)
        snap(pg, f"vortex{k}")
    time.sleep(1.2)
    snap(pg, "vortex_end")
    b.close()
ims = [Image.open(f) for f in files]
w, h = ims[0].size
s = 0.24
tw, th = int(w * s), int(h * s)
sheet = Image.new("RGB", (tw * len(ims), th), "white")
for k, im in enumerate(ims):
    sheet.paste(im.resize((tw, th)), (k * tw, 0))
sheet.save(os.path.join(SH, "sheet_v3.png"))
print("errors", errs or "none")
