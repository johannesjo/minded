#!/usr/bin/env python3
"""
Generates the Android loading-sky backgrounds as pre-dithered PNGs.

Why an image instead of a <shape>/Compose gradient: on an 8-bit surface a
smooth, low-contrast vertical gradient (worst: the dark sky, whose deep blues
crawl 1-2 quantization steps over hundreds of pixels) shows visible horizontal
banding -- the "weird lines". Runtime dither flags (android:dither, Paint
isDither) are no-ops on modern 8888 output. Baking the dither into the pixels
here makes the smoothing part of the image data, so it renders cleanly on every
device and API level with no shader or wide-gamut dependency.

The stops are the exact app gradient (mirrors --background-gradient in
extension/src/styles/_variables.scss), interpolated in sRGB space to match the
web look, then dithered with triangular-PDF
noise (TPDF, +/-1 LSB) before quantizing to 8-bit -- the textbook way to remove
banding. Re-run after changing the stops; output goes to res/drawable-nodpi/.
"""
import os

import numpy as np
from PIL import Image

OUT_DIR = os.path.join(
    os.path.dirname(__file__), "..", "app", "src", "main", "res", "drawable-nodpi"
)

# Vertical-only gradient, so width can be modest; it is stretched (gravity=fill /
# ContentScale.FillBounds) to any screen. Bands are horizontal, so the dither's
# vertical variation is what breaks them -- it survives the horizontal stretch.
# Height stays generous so tall phones only mildly upscale. Kept small to bound
# the PNG size, which the (incompressible) baked noise dominates.
WIDTH = 360
HEIGHT = 1280

# The home-screen widget card gets its own near-target-size renders: minifying
# the full-screen sky ~3x would undersample the baked dither and re-band, so
# the dither must be applied at (about) the size the launcher will draw.
CARD_WIDTH = 360
CARD_HEIGHT = 240

# (position 0..1, "#rrggbb"). Keep in sync with _variables.scss / Color.kt.
LIGHT_STOPS = [
    (0.00, "#cfe4f5"),
    (0.18, "#cfe4f5"),
    (0.36, "#d8ecd6"),
    (0.54, "#f5efc8"),
    (1.00, "#f6dcd2"),
]
DARK_STOPS = [
    (0.00, "#02091f"),
    (0.28, "#041238"),
    (0.68, "#0a2860"),
    (0.82, "#123262"),
    (0.92, "#233053"),
    (1.00, "#49313b"),
]


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def gradient_columns(stops, height):
    """One color per row (sRGB-space linear interpolation between stops)."""
    pos = np.array([p for p, _ in stops])
    cols = np.array([hex_rgb(c) for _, c in stops], dtype=float)
    ys = np.linspace(0.0, 1.0, height)
    out = np.empty((height, 3))
    for ch in range(3):
        out[:, ch] = np.interp(ys, pos, cols[:, ch])
    return out  # float, 0..255, shape (height, 3)


def render(stops, width=WIDTH, height=HEIGHT):
    rows = gradient_columns(stops, height)  # (H, 3)
    img = np.repeat(rows[:, None, :], width, axis=1)  # (H, W, 3)
    # Triangular PDF dither: sum of two uniforms => triangular on [-1, 1] LSB.
    rng = np.random.default_rng(42)
    noise = rng.random((height, width, 3)) - rng.random((height, width, 3))
    dithered = np.clip(np.round(img + noise), 0, 255).astype(np.uint8)
    return dithered


def write_png(path, arr):
    # Pillow's adaptive PNG filtering ("up" on a vertical gradient leaves mostly
    # near-zero residuals) compresses the baked dither far better than raw.
    Image.fromarray(arr, "RGB").save(path, optimize=True)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    outputs = (
        ("loading_sky_light", LIGHT_STOPS, WIDTH, HEIGHT),
        ("loading_sky_dark", DARK_STOPS, WIDTH, HEIGHT),
        ("widget_sky_light", LIGHT_STOPS, CARD_WIDTH, CARD_HEIGHT),
        ("widget_sky_dark", DARK_STOPS, CARD_WIDTH, CARD_HEIGHT),
    )
    for name, stops, width, height in outputs:
        path = os.path.join(OUT_DIR, name + ".png")
        write_png(path, render(stops, width, height))
        print(f"wrote {path} ({os.path.getsize(path) // 1024} KB)")


if __name__ == "__main__":
    main()
