"""Build dist/index.html: inline the parts/ modules and the instrument samples, subset the two calligraphy fonts to the glyphs the game uses and inline them."""
import base64
import io
import json
import os
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src", "game.html")
OUT = os.path.join(ROOT, "dist", "index.html")
OUT_DEBUG = os.path.join(ROOT, "dist", "debug.html")
PARTS = os.path.join(ROOT, "parts")
SAMPLES = os.path.join(ROOT, "samples")
FONTS = {
    "__FYT__": os.path.join(ROOT, "fonts", "ZhiMangXing.ttf"),
    "__FYK__": os.path.join(ROOT, "fonts", "MaShanZheng.ttf"),
}


def subset_b64(path: str, text: str) -> tuple[str, list[str]]:
    font = TTFont(path)
    cmap = font.getBestCmap()
    missing = sorted({ch for ch in text if ord(ch) > 32 and ord(ch) not in cmap})
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.notdef_outline = True
    ss = subset.Subsetter(opts)
    ss.populate(text=text)
    ss.subset(font)
    buf = io.BytesIO()
    font.flavor = "woff2"
    font.save(buf)
    return base64.b64encode(buf.getvalue()).decode("ascii"), missing


def samples_json(folder: str = SAMPLES) -> str:
    """samples/<instrument>_<note>.mp3 -> {"instrument": {"note": base64 mp3}}, read by music.js as window.MU_SAMPLES."""
    data: dict[str, dict[str, str]] = {}
    for name in sorted(os.listdir(folder)):
        if not name.endswith(".mp3"):
            continue
        inst, note = name[:-4].rsplit("_", 1)
        with open(os.path.join(folder, name), "rb") as fh:
            data.setdefault(inst, {})[note] = base64.b64encode(fh.read()).decode("ascii")
    return json.dumps(data, separators=(",", ":"))


def inline_parts(src: str, skip: tuple[str, ...] = ()) -> str:
    def part(m: re.Match) -> str:
        if m.group(1) in skip:
            return ""
        return open(os.path.join(PARTS, m.group(1)), encoding="utf-8").read().rstrip("\n")
    out, n = re.subn(r"^/\*@include ([\w.]+)\*/$", part, src, flags=re.M)
    if not skip:
        print(f"inlined {n} part(s)")
    return out


def main() -> int:
    raw = open(SRC, encoding="utf-8").read()
    src = inline_parts(raw)
    # glyphs the game can show: the music engine's Chinese is only comments and section names the game never displays
    chars = {ch for ch in inline_parts(raw, skip=("music.js",)) if ord(ch) > 127}
    chars |= set("0123456789+-:/% ")
    text = "".join(sorted(chars))
    out = src
    for key, path in FONTS.items():
        if key not in out:
            print(f"placeholder {key} missing", file=sys.stderr)
            return 1
        b64, missing = subset_b64(path, text)
        out = out.replace(key, b64)
        print(f"{os.path.basename(path)}: {len(b64) // 1024} KB base64, missing glyphs: {''.join(missing) or 'none'}")
    if "__SAMPLES__" not in out:
        print("placeholder __SAMPLES__ missing", file=sys.stderr)
        return 1
    sj = samples_json()
    out = out.replace("__SAMPLES__", sj)
    print(f"samples: {len(sj) // 1024} KB base64")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT_DEBUG, "w", encoding="utf-8") as fh:
        fh.write(out)
    prod = re.sub(r"/\*DEBUG\*/.*?/\*/DEBUG\*/", "", out, flags=re.S)
    prod = prod.replace(", deaths: deathC.join(',')", "")
    prod = prod.replace("deathC[bdead[i]]++; ", "").replace("\nconst deathC = [0, 0, 0, 0, 0, 0, 0, 0];", "")
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(prod)
    print(f"{len(text)} unique glyphs -> {OUT} ({len(out) // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
