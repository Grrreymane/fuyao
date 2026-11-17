"""Trim, normalise and re-encode the FluidR3_GM (CC BY 3.0) notes used by the music demo.

Source: https://github.com/gleitz/midi-js-soundfonts (FluidR3_GM, Creative Commons Attribution 3.0).
Usage: python3 tools/prep_samples.py <raw_dir> <out_dir>
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
# instrument -> (notes, keep seconds)
PLAN = {
    "shakuhachi": (["G3", "C4", "F4", "A4", "D5", "G5", "C6"], 3.05),
    "koto": (["C3", "G3", "D4", "A4", "E5", "B5"], 2.6),
    "shamisen": (["C3", "G3", "D4", "A4", "E5", "B5"], 2.2),
    "taiko_drum": (["C1"], 1.8),
    "woodblock": (["C5"], 0.25),
}


def load(path: str) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def process(x: np.ndarray, keep: float) -> np.ndarray:
    pk = float(np.max(np.abs(x))) or 1.0
    idx = np.nonzero(np.abs(x) > pk * 0.02)[0]
    start = max(0, int(idx[0]) - int(0.004 * SR)) if len(idx) else 0
    y = x[start:start + int(keep * SR)].copy()
    fade = int(0.12 * SR)
    if len(y) > fade:
        y[-fade:] *= 0.5 * (1 + np.cos(np.linspace(0, np.pi, fade)))
    return (y / pk * 0.9).astype(np.float32)


def encode(y: np.ndarray, out: str) -> None:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-c:a", "libmp3lame", "-q:a", "5", out], input=y.tobytes(), check=True)


def main() -> int:
    raw_dir, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    total = 0
    for inst, (notes, keep) in PLAN.items():
        for n in notes:
            y = process(load(os.path.join(raw_dir, inst, n + ".mp3")), keep)
            out = os.path.join(out_dir, f"{inst}_{n}.mp3")
            encode(y, out)
            total += os.path.getsize(out)
            print(f"{inst:11s} {n:3s} {len(y) / SR:.2f}s {os.path.getsize(out) // 1024} KB")
    print(f"total {total // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
