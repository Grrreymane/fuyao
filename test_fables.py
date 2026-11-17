"""Fly to each of the nine fables, screenshot it, check it is collected; the rider on the dragon; the scroll overlay."""
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
    pg.evaluate("localStorage.removeItem('fy-fables')")
    pg.evaluate("window.__fy.start()")
    time.sleep(3.4)
    for si in [0, 1, 2, 3, 5, 6, 7, 8]:
        pg.evaluate("window.__fy.birds(80)")
        f = pg.evaluate("window.__fy.fabs()")[si]
        pg.evaluate(f"window.__fy.jump({-f['y'] - 330})")
        time.sleep(1.1)
        fn = os.path.join(SH, f"fable_{si + 1}.png")
        pg.screenshot(path=fn)
        files.append(fn)
        time.sleep(3.2 if si == 7 else 1.6)
        print(si + 1, "collected" if pg.evaluate("window.__fy.fabs()")[si]["st"] else "NOT collected", flush=True)
    pg.evaluate("window.__fy.jump(21300)")
    time.sleep(1.2)
    pg.evaluate("window.__fy.ev('dragon')")
    time.sleep(2.25)
    fn = os.path.join(SH, "fable_5.png")
    pg.screenshot(path=fn)
    files.insert(4, fn)
    time.sleep(3)
    print("5 rider", "collected" if pg.evaluate("window.__fy.fabs()")[4]["st"] else "not collected (flock hit or far)", flush=True)
    pg.evaluate("window.__fy.ev('scroll')")
    time.sleep(1.2)
    fn = os.path.join(SH, "fable_scroll.png")
    pg.screenshot(path=fn)
    files.append(fn)
    print("mask", pg.evaluate("localStorage.getItem('fy-fables')"))
    b.close()
ims = [Image.open(f) for f in files]
w, h = ims[0].size
s = 0.26
tw, th = int(w * s), int(h * s)
sheet = Image.new("RGB", (tw * 5, th * 2), "white")
for k, im in enumerate(ims):
    sheet.paste(im.resize((tw, th)), ((k % 5) * tw, (k // 5) * th))
sheet.save(os.path.join(SH, "sheet_fables.png"))
print("errors", errs or "none")
