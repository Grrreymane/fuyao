"""Exercise the v2 events on a phone viewport: dragon sweep, meteor, cloud-gate crossing, finale into the Southern Gate.
Saves shots/v2_*.png and a contact sheet shots/sheet_v2.png; prints state after each step."""
import os
import time

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "debug.html")
SH = os.path.join(ROOT, "shots")
errs, files = [], []


def snap(pg, name):
    f = os.path.join(SH, f"v2_{name}.png")
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
    time.sleep(3.2)
    pg.evaluate("window.__fy.birds(150)")
    # dragon
    pg.evaluate("window.__fy.jump(21200)")
    time.sleep(1.5)
    pg.evaluate("window.__fy.ev('dragon')")
    time.sleep(0.8)
    snap(pg, "dragon_warn")
    time.sleep(1.4)
    snap(pg, "dragon_sweep")
    time.sleep(1.0)
    snap(pg, "dragon_after")
    # meteor
    pg.evaluate("window.__fy.jump(31200)")
    time.sleep(1.5)
    pg.evaluate("window.__fy.ev('meteor')")
    time.sleep(0.55)
    snap(pg, "meteor_warn")
    time.sleep(0.6)
    snap(pg, "meteor_hit")
    # cloud gate crossing 3 -> 4
    pg.evaluate("window.__fy.jump(14700)")
    for k in range(5):
        time.sleep(0.9 if k == 0 else 0.45)
        snap(pg, f"gate{k}")
    # finale
    pg.evaluate("window.__fy.birds(120)")
    pg.evaluate("window.__fy.jump(44300)")
    t0 = time.time()
    for name, at in [("fin_gate", 5.5), ("fin_peng", 13.5), ("fin_depart", 17.6), ("fin_enter", 19.2), ("fin_win", 23.5)]:
        time.sleep(max(0, at - (time.time() - t0)))
        snap(pg, name)
    b.close()
ims = [Image.open(f) for f in files]
w, h = ims[0].size
s = 0.24
tw, th = int(w * s), int(h * s)
cols = 8
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (tw * cols, th * rows), "white")
for k, im in enumerate(ims):
    sheet.paste(im.resize((tw, th)), ((k % cols) * tw, (k // cols) * th))
sheet.save(os.path.join(SH, "sheet_v2.png"))
print("errors", errs or "none")
