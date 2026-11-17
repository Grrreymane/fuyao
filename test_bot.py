"""Play a full game with the debug autopilot; log progress and screenshot each heaven and the ending."""
import os
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "debug.html")
SH = os.path.join(ROOT, "shots")
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    c = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    pg = c.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append((e.stack or str(e)).replace("file://" + ROOT, "")[:600]))
    pg.goto(URL)
    time.sleep(1.5)
    pg.evaluate("window.__fy.start(); window.__fy.bot(true)")
    t0 = time.time()
    last_stage = -1
    while time.time() - t0 < 560:
        time.sleep(1.0)
        i = pg.evaluate("window.__fy.info()")
        el = int(time.time() - t0)
        if i["stage"] != last_stage and i["state"] == "play":
            last_stage = i["stage"]
            time.sleep(1.6)
            pg.screenshot(path=os.path.join(SH, f"bot_stage{last_stage + 1}.png"))
        if el % 15 == 0:
            print(f"{el:4d}s", i, flush=True)
        if i["state"] in ("finale", "over"):
            print("END", el, i, flush=True)
            for k in range(8):
                time.sleep(2)
                pg.screenshot(path=os.path.join(SH, f"bot_end{k}.png"))
            print("final", pg.evaluate("window.__fy.info()"))
            break
    print("errors", errs or "none")
    b.close()
