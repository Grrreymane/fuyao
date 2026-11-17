"""Measure the sound per heaven in headless Chrome: output loudness, peak, new voices per second and what the music is doing.
The game is given a real click so the AudioContext starts the way it would for a player."""
import os
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "debug.html")
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--autoplay-policy=no-user-gesture-required", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    c = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    pg = c.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL)
    time.sleep(1.2)
    pg.mouse.click(195, 420)
    time.sleep(3.5)
    pg.evaluate("window.__fy.birds(200)")
    print("stage  rms    peak   voices/s  heaven  mode  samples", flush=True)
    for si in range(9):
        pg.evaluate(f"window.__fy.jump({si * 5000 + 1500})")
        time.sleep(4.5)
        v0 = pg.evaluate("window.__fy.audio()")
        rs, pk = [], 0
        t0 = time.time()
        while time.time() - t0 < 5:
            a = pg.evaluate("window.__fy.audio()")
            rs.append(a["rms"])
            pk = max(pk, a["peak"])
            time.sleep(0.1)
        v1 = pg.evaluate("window.__fy.audio()")
        rate = (v1["voices"] + v1["events"] - v0["voices"] - v0["events"]) / (time.time() - t0)
        print(f"{si + 1:5d}  {sum(rs) / len(rs):.3f}  {pk:.3f}  {rate:8.1f}  {v1['heaven']:6d}  {v1['mode']}  {v1['loaded']}  {v1['state']}", flush=True)
    b.close()
print("errors", errs or "none")
