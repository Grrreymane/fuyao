"""Drive the nine-heaven listening page like a listener on a phone and a desktop.
Screenshots for portrait phone, landscape phone and desktop go to /tmp/mu_shots/."""
import os
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
SHOTS = "/tmp/mu_shots"
os.makedirs(SHOTS, exist_ok=True)
fails = []


def check(cond, msg):
    print(("ok   " if cond else "FAIL ") + msg)
    if not cond:
        fails.append(msg)


def run(url, label, vp, mobile, flow=True):
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--autoplay-policy=no-user-gesture-required"])
        c = b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
        pg = c.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
        pg.goto(url)
        time.sleep(0.8)
        pg.screenshot(path=f"{SHOTS}/{label}_idle.png", full_page=True)
        tap = (lambda sel: pg.tap(sel)) if mobile else (lambda sel: pg.click(sel))
        st = lambda: pg.evaluate("MU.stats()")
        pressed = lambda sel: pg.evaluate(f"document.querySelector('{sel}').getAttribute('aria-pressed')")
        if flow:
            tap('.hv[data-si="0"]')
            time.sleep(1.5)
            s = st()
            check(s["mode"] == "play" and s["heaven"] == 0 and s["events"] > 0, f"{label}: 北冥 plays ({s['events']} events)")
            check(pressed('.hv[data-si="0"]') == "true", f"{label}: 北冥 button shows it is playing")
            time.sleep(1.0)
            check(pg.evaluate("MU.loaded"), f"{label}: samples decoded")
            tap('.hv[data-si="7"]')
            time.sleep(1.2)
            s = st()
            check(s["heaven"] == 7 and pressed('.hv[data-si="0"]') == "false", f"{label}: tapping 天风 passes the gate to it")
            tap('.chip[data-ev="threat"]')
            time.sleep(0.4)
            check(st()["threat"] > 0.5, f"{label}: 鹰来了 raises the threat ({st()['threat']})")
            tap('.chip[data-ev="tutti"]')
            time.sleep(0.3)
            check(pg.evaluate("MU.tuttiOn") and pressed('.chip[data-ev="tutti"]') == "true", f"{label}: 扶摇 starts")
            tap('.chip[data-ev="low"]')
            time.sleep(0.2)
            check(st()["low"] and pressed('.chip[data-ev="low"]') == "true", f"{label}: 鸟只剩几只 toggles on")
            tap('.chip[data-ev="low"]')
            time.sleep(0.2)
            check(not st()["low"], f"{label}: ... and off")
            pg.screenshot(path=f"{SHOTS}/{label}_playing.png")
            time.sleep(6.2)
            check(not pg.evaluate("MU.tuttiOn") and pressed('.chip[data-ev="tutti"]') == "false", f"{label}: 扶摇 ends after six seconds")
            tap('.chip[data-ev="finale"]')
            time.sleep(0.5)
            check(st()["mode"] == "finale", f"{label}: 抵达九万里 plays the finale")
            tap('#stop')
            time.sleep(0.5)
            check(st()["mode"] == "off", f"{label}: 停止 stops")
            tap('.chip[data-ev="tutti"]')
            time.sleep(0.3)
            check(not pg.evaluate("MU.tuttiOn") and pg.evaluate("document.getElementById('status').textContent").startswith("先点"), f"{label}: events need a heaven playing first")
            tap('#tour')
            time.sleep(1.5)
            s = st()
            check(s["mode"] == "play" and s["heaven"] == 0 and pressed('#tour') == "true", f"{label}: the tour starts in 北冥")
            tap('#tour')
            time.sleep(0.4)
            check(st()["mode"] == "off" and pressed('#tour') == "false", f"{label}: tapping the tour again stops it")
            tap('.chip[data-ev="over"]')
            time.sleep(0.4)
            check(st()["mode"] == "over", f"{label}: 失败 plays the lone qin")
        check(not errs, f"{label}: no page errors {errs[:3]}")
        b.close()


dbg = "file://" + os.path.join(ROOT, "demo", "dist", "music_debug.html")
prod = "file://" + os.path.join(ROOT, "demo", "dist", "music.html")
run(dbg, "phone", {"width": 390, "height": 844}, True)
run(dbg, "desktop", {"width": 1280, "height": 860}, False)
run(prod, "landscape", {"width": 844, "height": 390}, True, flow=False)
run(prod, "small", {"width": 320, "height": 640}, True, flow=False)
print("FAILURES:", fails or "none")
