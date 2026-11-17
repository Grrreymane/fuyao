"""Tinted glow sprites must stay drawable for the rest of the frame they were handed out in.

The bug: tinted() kept three colours per sprite and freed the oldest one (by zeroing its canvas) on a miss. Code that
held two tints at once (the 天风 vortex holds its mist and its haze) could have the first one freed by fetching the
second, and drawing it then threw "a canvas element with a width or height of 0". The new rainbow and lantern trails
cycle through many colours and made this frequent.
"""
import os
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "dist", "debug.html")

HOLD_THEN_MISS = """() => {
  const { tinted, glowSpr } = window.__fy.tints;
  // fill the cache so that the colour we fetch first is the oldest entry, then fetch a new colour while holding it
  for (const c of [[10, 20, 30], [40, 50, 60], [70, 80, 90], [100, 110, 120]]) tinted(glowSpr, c);
  const held = tinted(glowSpr, [40, 50, 60]);
  const other = tinted(glowSpr, [200, 16, 16]);
  const c = document.createElement('canvas'), g = c.getContext('2d');
  try { g.drawImage(held, 0, 0); g.drawImage(other, 0, 0); return 'ok ' + held.width + 'x' + held.height; }
  catch (e) { return 'threw ' + e.message; }
}"""

CHURN = """() => {
  // many colours in one frame (the rainbow trail), each drawn as soon as it is fetched, then the same again:
  // after the first pass the cache should serve them without making new canvases every frame
  const cols = [[226, 92, 80], [236, 160, 80], [238, 222, 110], [120, 196, 130], [100, 150, 225], [150, 120, 210], [220, 90, 60]];
  const seen = new Set(), { tinted, glowSpr, trailGlow } = window.__fy.tints;
  const get = trailGlow || (c => tinted(glowSpr, c));
  for (let f = 0; f < 3; f++) for (const c of cols) seen.add(get(c));
  return seen.size;
}"""

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 390, "height": 844})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL)
    time.sleep(1.0)
    fails = []
    r = pg.evaluate(HOLD_THEN_MISS)
    print("hold then miss:", r)
    if not r.startswith("ok"):
        fails.append("held tint freed: " + r)
    has_glow = pg.evaluate("!!window.__fy.tints.trailGlow")
    n = pg.evaluate(CHURN)
    print("distinct canvases for 7 colours over 3 frames:", n, "(dedicated glows)" if has_glow else "(tinted cache)")
    if n > 7:
        fails.append(f"trail glows are re-made every frame ({n} canvases for 7 colours)")
    # a frame later the freed canvases may be reclaimed; the cache must still hand out drawable ones
    pg.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")
    r2 = pg.evaluate("() => { const { tinted, glowSpr } = window.__fy.tints, c = tinted(glowSpr, [40, 50, 60]); return c.width + 'x' + c.height; }")
    print("after two frames:", r2)
    if r2.startswith("0"):
        fails.append("cache handed out a freed canvas: " + r2)
    print("errors", errs or "none")
    print("FAILURES", fails or "none")
    b.close()
