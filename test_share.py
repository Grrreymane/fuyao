"""今日之风 from the title, a fall, the daily record line and the result card; then a win card. Phone viewport."""
import base64
import os
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "debug.html")
SH = os.path.join(ROOT, "shots")
errs = []


def save_card(pg, name):
    src = pg.evaluate("document.getElementById('shareImg').src")
    open(os.path.join(SH, name), "wb").write(base64.b64decode(src.split(",", 1)[1]))
    return len(src)


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    c = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = c.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto(URL)
    time.sleep(1.5)
    pg.screenshot(path=os.path.join(SH, "share_title.png"))
    box = pg.evaluate("(() => { const r = document.getElementById('bDaily').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()")
    pg.touchscreen.tap(box[0], box[1])
    time.sleep(3.6)
    seed1 = pg.evaluate("window.__fy.segs(5, 8)")
    print("daily state", pg.evaluate("window.__fy.info()")["state"], seed1)
    pg.evaluate("window.__fy.birds(90)")
    pg.evaluate("window.__fy.jump(16400)")
    time.sleep(1.5)
    pg.evaluate("window.__fy.ev('wipe')")
    time.sleep(3.5)
    print("over rec:", pg.evaluate("document.getElementById('oRec').textContent"))
    pg.evaluate("document.getElementById('oCard').click()")
    time.sleep(1.0)
    print("card bytes", save_card(pg, "card_fall.jpg"), "overlay on:", pg.evaluate("document.getElementById('share').classList.contains('on')"))
    pg.screenshot(path=os.path.join(SH, "share_overlay.png"))
    pg.evaluate("document.getElementById('shareClose').click()")
    time.sleep(0.5)
    # 再起 keeps today's map
    pg.evaluate("document.getElementById('again').click()")
    time.sleep(3.6)
    print("restart keeps daily map:", pg.evaluate("window.__fy.segs(5, 8)") == seed1)
    pg.evaluate("window.__fy.birds(200)")
    pg.evaluate("window.__fy.jump(44500)")
    time.sleep(24)
    pg.evaluate("document.getElementById('wCard').click()")
    time.sleep(1.0)
    print("win card bytes", save_card(pg, "card_win.jpg"), "daily best text after:", pg.evaluate("localStorage.getItem('fy-daily')"))
    b.close()
print("errors", errs or "none")
