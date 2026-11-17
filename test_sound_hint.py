"""The title page asks players to turn the sound on, and says how when the game was muted last time."""
import os
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "index.html")
VIEWS = {
    "phone": dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True),
    "land": dict(viewport={"width": 844, "height": 390}, device_scale_factor=2, is_mobile=True, has_touch=True),
    "desk": dict(viewport={"width": 1440, "height": 900}),
}
SHOTS = os.environ.get("SHOTS")

def hint(pg):
    return pg.evaluate("""() => { const e = document.getElementById('sndT'), r = e.getBoundingClientRect();
      return { text: e.innerText.replace(/\\s+/g, ' ').trim(), vis: r.width > 0 && r.top >= 0 && r.bottom <= innerHeight && getComputedStyle(e).opacity > 0.5 }; }""")

fails = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    for name, kw in VIEWS.items():
        c = b.new_context(**kw); pg = c.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(URL); time.sleep(1.0)
        h = hint(pg); print(name, "sound on:", h)
        if "开启声音，获得最好的体验" not in h["text"] or "静音" in h["text"] or not h["vis"]:
            fails.append(f"{name}: hint wrong with sound on: {h}")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/snd_{name}.png")
        # muted from a previous visit
        pg.evaluate("localStorage.setItem('fy-mute', '1')"); pg.reload(); time.sleep(1.0)
        h = hint(pg); print(name, "muted:", h)
        want = "点这里开启" if name != "desk" else "按 M"
        if "现在是静音" not in h["text"] or want not in h["text"]:
            fails.append(f"{name}: muted hint missing or no sound button: {h}")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/snd_{name}_muted.png")
        # turning the sound back on from the title clears the second line
        if name == "desk": pg.keyboard.press("m")
        else: pg.tap("#sndS")
        time.sleep(0.3); h = hint(pg); print(name, "unmuted:", h)
        if "静音" in h["text"]: fails.append(f"{name}: muted line stays after unmuting: {h}")
        st = pg.evaluate("document.getElementById('title').classList.contains('on')")
        if not st: fails.append(f"{name}: turning the sound on also started the game")
        # starting the game hides the title and the hint with it
        pg.evaluate("localStorage.setItem('fy-mute', '0')")
        pg.mouse.click(kw["viewport"]["width"] // 2, kw["viewport"]["height"] // 2); time.sleep(1.5)
        op = pg.evaluate("getComputedStyle(document.getElementById('title')).opacity")
        print(name, "title opacity after start:", op)
        if float(op) > 0.05: fails.append(f"{name}: title still showing after start ({op})")
        if errs: fails.append(f"{name}: errors {errs}")
        c.close()
    b.close()
print("FAILURES", fails or "none")
