"""Game over in a late heaven -> title and quote on the sheet, continue button -> flies on from that heaven with 24 birds.
Then a win -> arrival title. Phone viewport; saves shots/cont_*.png."""
import os
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "debug.html")
SH = os.path.join(ROOT, "shots")
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
    time.sleep(3.4)
    pg.evaluate("window.__fy.birds(60)")
    pg.evaluate("window.__fy.jump(26500)")
    time.sleep(2.0)
    pg.evaluate("window.__fy.ev('wipe')")
    time.sleep(3.5)
    sheet = pg.evaluate("({ title: document.getElementById('oTn').textContent, quote: document.getElementById('oQ').textContent, rec: document.getElementById('oRec').textContent, cont: document.getElementById('cont').textContent, hidden: document.getElementById('cont').hidden })")
    print("over sheet", sheet, pg.evaluate("window.__fy.info()")["state"])
    pg.screenshot(path=os.path.join(SH, "cont_over.png"))
    box = pg.evaluate("(() => { const r = document.getElementById('cont').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()")
    pg.touchscreen.tap(box[0], box[1])
    time.sleep(2.5)
    print("after continue", pg.evaluate("window.__fy.info()"))
    pg.screenshot(path=os.path.join(SH, "cont_play.png"))
    pg.evaluate("window.__fy.ev('wipe')")
    time.sleep(3.5)
    print("continued over rec:", pg.evaluate("document.getElementById('oRec').textContent"))
    # win title
    pg.evaluate("document.getElementById('again').click()")
    time.sleep(4.0)
    pg.evaluate("window.__fy.birds(150)")
    pg.evaluate("window.__fy.jump(44500)")
    time.sleep(24)
    print("win", pg.evaluate("({ n: document.getElementById('wTn').textContent, q: document.getElementById('wTq').textContent, rec: document.getElementById('wRec').textContent })"), pg.evaluate("window.__fy.info()")["state"])
    pg.screenshot(path=os.path.join(SH, "cont_win.png"))
    b.close()
print("errors", errs or "none")
