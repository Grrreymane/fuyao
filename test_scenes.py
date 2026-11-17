"""Jump through the nine heavens on a phone viewport, screenshot each, and build a contact sheet (shots/sheet_scenes.png).

usage: python3 test_scenes.py [alt_offset] [stages]   e.g. python3 test_scenes.py 2600 0,1,2
"""
import os
import sys
import time

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "debug.html")
SH = os.path.join(ROOT, "shots")
off = int(sys.argv[1]) if len(sys.argv) > 1 else 1800
which = [int(x) for x in sys.argv[2].split(",")] if len(sys.argv) > 2 else list(range(9))
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    c = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = c.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto(URL)
    time.sleep(1.2)
    pg.evaluate("window.__fy.start()")
    time.sleep(3.2)
    pg.evaluate("window.__fy.birds(120)")
    files = []
    for si in which:
        pg.evaluate(f"window.__fy.jump({si * 5000 + off})")
        time.sleep(2.4)
        f = os.path.join(SH, f"scene_{si + 1}.png")
        pg.screenshot(path=f)
        files.append(f)
        print(si + 1, pg.evaluate("window.__fy.info()"), flush=True)
    b.close()
ims = [Image.open(f) for f in files]
w, h = ims[0].size
s = 0.3
tw, th = int(w * s), int(h * s)
cols = min(5, len(ims))
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (tw * cols, th * rows), "white")
for k, im in enumerate(ims):
    sheet.paste(im.resize((tw, th)), ((k % cols) * tw, (k // cols) * th))
sheet.save(os.path.join(SH, "sheet_scenes.png"))
print("errors", errs or "none")
