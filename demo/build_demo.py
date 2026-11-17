"""Build the music demo: inline the audio modules, the samples (base64 mp3) and the font subsets.

Writes demo/dist/music_debug.html (with test hooks) and demo/dist/music.html (published version).
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)
from build import FONTS, samples_json, subset_b64  # noqa: E402  (shared with the game build)

SRC = os.path.join(HERE, "music.html")
PARTS = os.path.join(ROOT, "parts")
DIST = os.path.join(HERE, "dist")


def inline_parts(src: str) -> str:
    def part(m: re.Match) -> str:
        return open(os.path.join(PARTS, m.group(1)), encoding="utf-8").read().rstrip("\n")
    out, n = re.subn(r"^/\*@include ([\w.]+)\*/$", part, src, flags=re.M)
    print(f"inlined {n} part(s)")
    return out


def main() -> int:
    src = inline_parts(open(SRC, encoding="utf-8").read())
    text = "".join(sorted({ch for ch in src if ord(ch) > 127} | set("0123456789·")))
    out = src
    for key, path in FONTS.items():
        b64, missing = subset_b64(path, text)
        out = out.replace(key, b64)
        print(f"{os.path.basename(path)}: {len(b64) // 1024} KB, missing glyphs: {''.join(missing) or 'none'}")
    sj = samples_json()
    out = out.replace("__SAMPLES__", sj)
    print(f"samples: {len(sj) // 1024} KB")
    os.makedirs(DIST, exist_ok=True)
    with open(os.path.join(DIST, "music_debug.html"), "w", encoding="utf-8") as fh:
        fh.write(out)
    prod = re.sub(r"/\*DEBUG\*/.*?/\*/DEBUG\*/", "", out, flags=re.S)
    with open(os.path.join(DIST, "music.html"), "w", encoding="utf-8") as fh:
        fh.write(prod)
    print(f"-> dist/music.html ({len(prod) // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
