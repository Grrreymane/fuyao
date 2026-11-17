"""Render the nine-heaven music offline in headless Chrome and check it.

- every heaven on its own: level, peak, clipping, errors
- the game's signals: threat adds drums, a thin flock thins the band, riding the whirlwind (tutti) lifts it, game over leaves a lone qin
- a full ascent like the demo page's tour: loudness per heaven, no silent gaps, the finale
Writes WAVs (mono 22.05 kHz) and spectrograms to /tmp/mu_render/. Usage: python3 test_music_heavens.py [quick]
"""
import base64
import os
import sys
import wave

import numpy as np
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file://" + os.path.join(ROOT, "demo", "dist", "music_debug.html")
OUT = "/tmp/mu_render"
NAMES = ["北冥", "松崖", "飞瀑", "云海", "雷泽", "落日", "星河", "天风", "九霄"]
fails = []

JS = """async ([script, dur, only, wav]) => {
  const r = await MU.render(script, dur, only);
  const b = r.buf, L = b.getChannelData(0), R = b.getChannelData(1), n = L.length, sr = b.sampleRate;
  let pk = 0, clip = 0;
  for (let i = 0; i < n; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (a > pk) pk = a; if (a > 0.98) clip++; }
  const win = Math.floor(sr / 4), rms = [];
  for (let s = 0; s + win <= n; s += win) { let q = 0; for (let i = s; i < s + win; i++) q += (L[i] * L[i] + R[i] * R[i]) / 2; rms.push(Math.sqrt(q / win)); }
  let data = null;
  if (wav) { // mono, 22.05 kHz
    const m = Math.floor(n / 2), pcm = new Int16Array(m);
    for (let i = 0; i < m; i++) pcm[i] = Math.max(-1, Math.min(1, (L[2 * i] + R[2 * i]) / 2)) * 32767;
    const u8 = new Uint8Array(pcm.buffer); let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    data = btoa(s);
  }
  return { pk, clip, win: rms, events: r.events, data };
}"""


def check(cond, msg):
    print(("ok   " if cond else "FAIL ") + msg)
    if not cond:
        fails.append(msg)


def db(v):
    return 20 * np.log10(max(float(v), 1e-6))


def render(pw, script, dur, only=None, wav=False):
    b = pw.chromium.launch(executable_path="/usr/bin/google-chrome")
    pg = b.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto(URL)
    res = pg.evaluate(JS, [script, dur, only, wav])
    b.close()
    res["errors"] = errs
    res["win"] = np.array(res["win"])
    return res


def seg(res, a, b):  # rms dB of [a, b) seconds (0.25 s windows)
    w = res["win"][int(a * 4):int(b * 4)]
    return db(np.sqrt((w ** 2).mean())) if len(w) else -120


def save(name, res, marks=()):
    os.makedirs(OUT, exist_ok=True)
    raw = base64.b64decode(res["data"])
    sr = 22050
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(raw)
    x = np.frombuffer(raw, dtype=np.int16) / 32768.0
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(2, 1, figsize=(16, 6), gridspec_kw={"height_ratios": [3, 1]})
    ax[0].specgram(x, NFFT=2048, Fs=sr, noverlap=1024, cmap="magma", vmin=-110)
    ax[0].set_ylim(0, 5000); ax[0].set_title(name)
    t = np.arange(len(res["win"])) * 0.25
    ax[1].plot(t, 20 * np.log10(np.maximum(res["win"], 1e-5)), lw=0.8); ax[1].set_ylim(-60, 0); ax[1].grid(alpha=.3)
    for m, lab in marks:
        ax[1].axvline(m, color="r", lw=0.6); ax[1].text(m + 0.5, -8, lab, fontsize=8)
    fig.tight_layout(); fig.savefig(os.path.join(OUT, name + ".png"), dpi=60); plt.close(fig)


def main():
    quick = "quick" in sys.argv
    with sync_playwright() as pw:
        # 1. each heaven alone
        for si in range(9):
            r = render(pw, [[0, "start", si]], 24)
            body = seg(r, 2, 24)
            print(f"   {NAMES[si]}: rms {body:.1f} dB  peak {r['pk']:.2f}  events {r['events']}")
            check(not r["errors"], f"{NAMES[si]}: no errors {r['errors'][:2]}")
            check(r["clip"] == 0 and r["pk"] < 0.98, f"{NAMES[si]}: no clipping (peak {r['pk']:.2f})")
            check(-32 < body < -11, f"{NAMES[si]}: level in range ({body:.1f} dB)")
            quiet = [i / 4 for i, v in enumerate(r["win"][8:], 8) if db(v) < -55]
            check(len(quiet) < 6, f"{NAMES[si]}: no long silences ({len(quiet)} quiet quarter-seconds)")
        if quick:
            print("FAILURES:", fails or "none"); return
        # 2. signals
        r0 = render(pw, [[0, "start", 2]], 16, ["drums"])
        r1 = render(pw, [[0, "start", 2], [6, "threat", 1], [7, "threat", 1], [8, "threat", 1], [9, "threat", 1]], 16, ["drums"])
        check(seg(r1, 7, 11) > seg(r0, 7, 11) + 6, f"threat adds drums in 飞瀑 ({seg(r0, 7, 11):.1f} -> {seg(r1, 7, 11):.1f} dB)")
        a = render(pw, [[0, "start", 7]], 20)
        b2 = render(pw, [[0, "start", 7], [8, "low", True]], 20)
        check(seg(b2, 10, 18) < seg(a, 10, 18) - 3, f"a thin flock thins 天风 ({seg(a, 10, 18):.1f} -> {seg(b2, 10, 18):.1f} dB)")
        p = render(pw, [[0, "start", 5], [8, "tutti", 6]], 20)
        n = render(pw, [[0, "start", 5]], 20)
        check(seg(p, 8.5, 13.5) > seg(n, 8.5, 13.5) + 2, f"tutti lifts 落日 ({seg(n, 8.5, 13.5):.1f} -> {seg(p, 8.5, 13.5):.1f} dB)")
        check(abs(seg(p, 16, 20) - seg(n, 16, 20)) < 3, f"tutti ends after six seconds ({seg(n, 16, 20):.1f} vs {seg(p, 16, 20):.1f} dB)")
        o = render(pw, [[0, "start", 4], [6, "over"]], 16, None, True)
        check(not o["errors"], f"game over: no errors {o['errors'][:2]}")
        check(seg(o, 8, 13) < seg(o, 2, 6) - 4 and seg(o, 8, 13) > -45, f"game over: band stops, the qin plays on ({seg(o, 2, 6):.1f} -> {seg(o, 8, 13):.1f} dB)")
        save("over", o, [(6, "over")])
        # 3. the full ascent (the demo page's tour)
        tour = [[0, "start", 0], [20, "stage", 1], [40, "stage", 2], [60, "stage", 3], [70, "threat", 1], [80, "stage", 4], [87, "threat", 1], [93, "threat", 1],
                [100, "stage", 5], [104, "low", True], [113, "low", False], [120, "stage", 6], [127, "cue", "fable"], [140, "stage", 7], [146, "cue", "wind"],
                [149, "tutti", 6], [160, "stage", 8], [167, "threat", 1], [180, "finale"]]
        t = render(pw, tour, 215, None, True)
        check(not t["errors"], f"tour: no errors {t['errors'][:2]}")
        check(t["clip"] == 0, f"tour: no clipping (peak {t['pk']:.2f})")
        levels = [seg(t, 20 * k + 2, 20 * k + 20) for k in range(9)]
        print("   tour loudness by heaven:", "  ".join(f"{NAMES[k]} {v:.1f}" for k, v in enumerate(levels)))
        check(levels[7] > levels[0] + 4 and levels[8] > levels[1] + 4, "tour: the climb gets louder from 北冥 to 天风/九霄")
        gaps = [i / 4 for i, v in enumerate(t["win"][4:int(205 * 4)], 4) if db(v) < -50]
        check(len(gaps) < 8, f"tour: no dropouts ({len(gaps)} quiet quarter-seconds: {gaps[:6]})")
        check(seg(t, 181, 186) > -24, f"tour: the finale is heard ({seg(t, 181, 186):.1f} dB)")
        check(seg(t, 200, 214) > -45, f"tour: the quiet harmonics carry on after the finale ({seg(t, 200, 214):.1f} dB)")
        save("tour", t, [(20 * k, NAMES[k]) for k in range(9)] + [(180, "finale")])
    print("FAILURES:", fails or "none")


if __name__ == "__main__":
    main()
