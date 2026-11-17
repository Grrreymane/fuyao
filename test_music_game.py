"""The new music inside the game, on a phone (touch), a landscape phone and a desktop (mouse).

Checks: no audio before the first gesture; the title credit is on screen and leaves the game's taps alone; a real tap starts
北冥; each heaven gate switches the band; a hawk raises the drums; 扶摇 lasts 6 s; a thin flock is heard; mute and pause;
game over -> the lone qin; again -> 北冥; continue -> the heaven where the flock fell; (desktop) arrival -> finale -> rest.

usage: python3 test_music_game.py [phone|land|desk ...]    shots in /tmp/mu_game
"""
import os
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "debug.html")
OUT = "/tmp/mu_game"
os.makedirs(OUT, exist_ok=True)
DEVICES = {
    "phone": dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True),
    "land": dict(viewport={"width": 844, "height": 390}, device_scale_factor=2, is_mobile=True, has_touch=True),
    "desk": dict(viewport={"width": 1440, "height": 900}, device_scale_factor=1),
}
which = sys.argv[1:] or list(DEVICES)
fails, errs = [], []


def check(dev, name, ok, detail=""):
    print(f"  {'ok ' if ok else 'FAIL'} {name} {detail}", flush=True)
    if not ok:
        fails.append(f"{dev}: {name} {detail}")


def wait_for(pg, js, timeout=8.0, step=0.15):
    t0 = time.time()
    while time.time() - t0 < timeout:
        v = pg.evaluate(js)
        if v:
            return v
        time.sleep(step)
    return pg.evaluate(js)


def tap(pg, dev, sel):
    box = pg.evaluate(f"(() => {{ const r = document.querySelector('{sel}').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }})()")
    if DEVICES[dev].get("has_touch"):
        pg.touchscreen.tap(box[0], box[1])
    else:
        pg.mouse.click(box[0], box[1])


def au(pg):
    return pg.evaluate("window.__fy.audio()")


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    for dev in which:
        print(dev, flush=True)
        c = b.new_context(**DEVICES[dev])
        pg = c.new_page()
        pg.on("pageerror", lambda e, d=dev: errs.append(f"{d}: {e}"))
        pg.on("console", lambda m, d=dev: m.type == "error" and errs.append(f"{d}: {m.text}"))
        pg.goto(URL)
        time.sleep(1.4)
        check(dev, "no audio before a gesture", au(pg) is None)
        cred = pg.evaluate("""(() => { const e = document.getElementById('cred'), r = e.getBoundingClientRect(), a = e.querySelector('a');
            return { op: getComputedStyle(e).opacity, text: e.textContent, href: a.href, l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, h: innerHeight }; })()""")
        time.sleep(1.0)
        cred["op"] = pg.evaluate("getComputedStyle(document.getElementById('cred')).opacity")
        check(dev, "credit shown", float(cred["op"]) > 0.9 and "FluidR3_GM" in cred["text"] and "creativecommons.org/licenses/by/3.0" in cred["href"], str(cred["op"]))
        check(dev, "credit inside the screen", cred["l"] >= 0 and cred["r"] <= cred["w"] and cred["b"] <= cred["h"], f"{cred['l']:.0f}-{cred['r']:.0f} x {cred['t']:.0f}-{cred['b']:.0f}")
        rot = pg.evaluate("(() => { const e = document.getElementById('rot'); if (getComputedStyle(e).display === 'none') return null; const r = e.getBoundingClientRect(); return [r.left, r.right, r.top, r.bottom]; })()")
        if rot:
            overlap = not (rot[1] < cred["l"] or rot[0] > cred["r"] or rot[3] < cred["t"] or rot[2] > cred["b"])
            check(dev, "credit clear of the rotate hint", not overlap, str(rot))
        pg.screenshot(path=f"{OUT}/{dev}_title.png")
        # the credit link is on top where it is drawn, and following it does not start the game
        # (a real tap would open a tab, which leaves headless Chrome throttling this one, so the click is cancelled here)
        top = pg.evaluate("(() => { const a = document.querySelector('#cred a'), r = a.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === a; })()")
        pg.evaluate("(() => { const a = document.querySelector('#cred a'); a.addEventListener('click', e => e.preventDefault(), { once: true }); a.click(); })()")
        time.sleep(0.6)
        check(dev, "credit link tappable and leaves the title alone", top and pg.evaluate("window.__fy.info().state") == "title")
        tap(pg, dev, "#title .tap")
        a = wait_for(pg, "(() => { const a = window.__fy.audio(); return a && a.state === 'running' && a.mode === 'play' ? a : null; })()")
        check(dev, "a tap starts 北冥", bool(a) and a["heaven"] == 0, str(a and {k: a[k] for k in ("state", "mode", "heaven")}))
        wait_for(pg, "window.__fy.info().state === 'play'", 6)
        check(dev, "samples decoded", wait_for(pg, "window.__fy.audio().loaded > 0", 6) is True)
        pg.evaluate("window.__fy.birds(80)")
        pg.evaluate("window.__fy.jump(11500)")
        h = wait_for(pg, "window.__fy.audio().heaven === 2", 5)
        check(dev, "gate into 飞瀑", h is True, str(au(pg)["heaven"]))
        pg.evaluate("window.__fy.ev('hawk')")
        thr = 0
        t0 = time.time()
        while time.time() - t0 < 6:
            thr = max(thr, au(pg)["threat"])
            time.sleep(0.15)
        check(dev, "a hawk brings the drums", thr > 0.3, f"threat {thr}")
        if dev != "land":
            pg.evaluate("window.__fy.ev('vortex')")
            check(dev, "扶摇 on: full band", wait_for(pg, "window.__fy.audio().tutti", 1.5) is True)
            time.sleep(6.6)
            check(dev, "扶摇 over after 6 s", au(pg)["tutti"] is False)
            pg.evaluate("window.__fy.thin(6)")
            check(dev, "a thin flock is heard", wait_for(pg, "window.__fy.audio().low", 2) is True)
            pg.evaluate("window.__fy.birds(60)")
            check(dev, "the band returns", wait_for(pg, "!window.__fy.audio().low", 2) is True)
            tap(pg, dev, "#bSnd")
            time.sleep(0.8)
            muted = max(au(pg)["rms"] for _ in range(5))
            tap(pg, dev, "#bSnd")
            time.sleep(0.8)
            check(dev, "mute silences the music", muted < 0.003, f"rms {muted:.4f}")
            tap(pg, dev, "#bPau")
            time.sleep(0.5)
            check(dev, "pause suspends", au(pg)["state"] == "suspended")
            tap(pg, dev, "#resume")
            check(dev, "resume runs", wait_for(pg, "window.__fy.audio().state === 'running'", 2) is True)
        pg.evaluate("window.__fy.ev('wipe')")
        check(dev, "game over -> the lone qin", wait_for(pg, "window.__fy.audio().mode === 'over'", 6) is True, au(pg)["mode"])
        pg.screenshot(path=f"{OUT}/{dev}_over.png")
        tap(pg, dev, "#cont")
        h = wait_for(pg, "(() => { const a = window.__fy.audio(); return a.mode === 'play' && a.heaven === 2; })()", 5)
        check(dev, "continue -> 飞瀑 again", h is True, str({k: au(pg)[k] for k in ("mode", "heaven")}))
        pg.evaluate("window.__fy.ev('wipe')")
        wait_for(pg, "window.__fy.info().state === 'over'", 6)
        time.sleep(1.0)
        tap(pg, dev, "#again")
        h = wait_for(pg, "(() => { const a = window.__fy.audio(); return a.mode === 'play' && a.heaven === 0; })()", 3)
        check(dev, "again -> 北冥 from the first moment", h is True, str({k: au(pg)[k] for k in ("mode", "heaven")}))
        if dev == "desk":
            wait_for(pg, "window.__fy.info().state === 'play'", 6)
            pg.evaluate("window.__fy.birds(150)")
            pg.evaluate("window.__fy.jump(44700)")
            check(dev, "arrival -> finale", wait_for(pg, "window.__fy.audio().mode === 'finale'", 12) is True, au(pg)["mode"])
            check(dev, "win sheet during the finale music", wait_for(pg, "window.__fy.info().state === 'win'", 20) is True and au(pg)["mode"] == "finale", au(pg)["mode"])
            check(dev, "finale -> rest", wait_for(pg, "window.__fy.audio().mode === 'rest'", 22) is True, au(pg)["mode"])
            lv = max(au(pg)["rms"] for _ in range(10))
            check(dev, "rest is audible", lv > 0.004, f"rms {lv:.4f}")
            pg.screenshot(path=f"{OUT}/{dev}_win.png")
        c.close()
    b.close()
print("errors", errs or "none")
print("FAILURES", fails or "none")
