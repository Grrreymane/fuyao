"""Forks: where they fall in one run, what they look like, and a flock passing through one. Phone viewport."""
import os
import time

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "debug.html")
SH = os.path.join(ROOT, "shots")
errs, files = [], []
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
    forks = pg.evaluate("window.__fy.forks()")
    print("forks", forks)
    for k, (f0, L, side) in enumerate(forks[:3]):
        pg.evaluate("window.__fy.birds(120)")
        pg.evaluate(f"window.__fy.jump({f0 - 300})")
        b0 = pg.evaluate("window.__fy.info()")["birds"]
        for q, dt in enumerate([1.6, 2.6, 3.2]):
            time.sleep(dt)
            fn = os.path.join(SH, f"fork{k}_{q}.png")
            pg.screenshot(path=fn)
            files.append(fn)
        info = pg.evaluate("window.__fy.info()")
        print(k, "alt", info["alt"], "birds", b0, "->", info["birds"], "deaths", info["deaths"], flush=True)
    b.close()
ims = [Image.open(f) for f in files]
w, h = ims[0].size
s = 0.26
tw, th = int(w * s), int(h * s)
cols = 3
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (tw * cols, th * rows), "white")
for k, im in enumerate(ims):
    sheet.paste(im.resize((tw, th)), ((k % cols) * tw, (k // cols) * th))
sheet.save(os.path.join(SH, "sheet_forks.png"))
print("errors", errs or "none")
