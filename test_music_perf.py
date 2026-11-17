"""What the music costs the game loop: main-thread time in AU.tick per step and frame rate, with the band playing
and with it stopped, in the busiest heavens (雷泽, 天风, 九霄) on a phone viewport with the autopilot flying."""
import os
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "debug.html")
errs = []


def measure(pg, secs):
    pg.evaluate("window.__fy.auPerf(true)")
    fps = []
    t0 = time.time()
    while time.time() - t0 < secs:
        time.sleep(0.5)
        fps.append(pg.evaluate("window.__fy.info().fps"))
    return pg.evaluate("window.__fy.auPerf(false)"), sum(fps) / len(fps)


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    c = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = c.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL)
    time.sleep(1.4)
    pg.touchscreen.tap(195, 560)
    time.sleep(3.2)
    pg.evaluate("window.__fy.bot(true)")
    print("heaven      AU.tick avg/max ms   fps   | music stopped: avg/max ms   fps", flush=True)
    for si in (4, 7, 4, 7, 8):  # 雷泽 and 天风 twice: the second pass finds every plucked-string buffer already made
        pg.evaluate("window.__fy.birds(150)")
        pg.evaluate(f"window.__fy.jump({si * 5000 + 200})")
        time.sleep(2.5)
        on, fon = measure(pg, 8)
        pg.evaluate("window.__fy.music('stop', 0.1)")
        time.sleep(0.5)
        off, foff = measure(pg, 6)
        pg.evaluate(f"window.__fy.music('start', {si})")
        print(f"{si + 1:2d} {pg.evaluate('window.__fy.info().state'):6s}  {on['avg']:6.3f} / {on['max']:5.2f}   {fon:5.1f} |  {off['avg']:6.3f} / {off['max']:5.2f}   {foff:5.1f}", flush=True)
    b.close()
print("errors", errs or "none")
