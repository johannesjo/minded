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
banding. Re-run after changing the stops; output goes to res/drawable-nodpi/
and (for the iOS widget card, which needs the same dithered skies at its own
target size) to extension/ios/App/MindedWidget/Assets.xcassets/. One generator,
one dither, one copy of the colours -- the platforms only differ in size.
"""
import json
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

# The iOS widget card (WidgetKit systemMedium) draws the same skies at its own
# target size -- up to ~364x170pt (@3x ~1092x510px). Rendering at @2x of the
# largest face keeps the mild-upscale ratio the Android card already accepts
# (its 360-wide PNG draws at up to ~510px), at a quarter of the @3x byte cost.
IOS_OUT_DIR = os.path.join(
    os.path.dirname(__file__),
    "..", "..", "extension", "ios", "App", "MindedWidget", "Assets.xcassets",
)
IOS_CARD_WIDTH = 728
IOS_CARD_HEIGHT = 340

# (position 0..1, "#rrggbb"). Keep in sync with _variables.scss / Color.kt.
LIGHT_STOPS = [
    (0.00, "#cfe4f5"),
    (0.18, "#cfe4f5"),
    (0.36, "#d8ecd6"),
    (0.54, "#f5efc8"),
    (1.00, "#f6dcd2"),
]

# The widget card's sky steps through the app's ambient time-of-day timeline:
# one render per keyframe, colours verbatim from AMBIENT_SKY_KEYFRAMES in
# extension/src/shared/skyTimeline.ts (keep in sync; WidgetSky.kt picks the
# render for the hour). The 9:00 "morning" keyframe is the classic static sky,
# i.e. LIGHT_STOPS above. Stop positions mirror ambientSkyGradient().
AMBIENT_KEYFRAME_COLORS = {
    "dawn": ["#c9d3ea", "#dde5e4", "#f3e6cf", "#f5cfc3"],
    "morning": ["#cfe4f5", "#d8ecd6", "#f5efc8", "#f6dcd2"],
    "midday": ["#c5e0f7", "#d6eee3", "#eff2d6", "#f6e8d6"],
    "afternoon": ["#cfdff0", "#dfead8", "#f6ecc8", "#f7d9c9"],
    "dusk": ["#c0c8e6", "#e0d2d6", "#f6dcb8", "#f1c0ab"],
}


def ambient_stops(colors):
    """skyTimeline.ts ambientSkyGradient(): c0 held to 18%, horizon at 100%."""
    c0, c1, c2, c3 = colors
    return [(0.00, c0), (0.18, c0), (0.36, c1), (0.54, c2), (1.00, c3)]


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


def write_imageset(name, arr):
    """A single-scale universal imageset in the iOS widget's asset catalog."""
    imageset_dir = os.path.join(IOS_OUT_DIR, name + ".imageset")
    os.makedirs(imageset_dir, exist_ok=True)
    write_png(os.path.join(imageset_dir, name + ".png"), arr)
    with open(os.path.join(imageset_dir, "Contents.json"), "w") as f:
        json.dump(
            {
                "images": [{"filename": name + ".png", "idiom": "universal"}],
                "info": {"author": "gen_loading_sky.py", "version": 1},
            },
            f,
            indent=2,
        )
        f.write("\n")
    return imageset_dir


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    outputs = [
        ("loading_sky_light", LIGHT_STOPS, WIDTH, HEIGHT),
        ("loading_sky_dark", DARK_STOPS, WIDTH, HEIGHT),
        ("widget_sky_dark", DARK_STOPS, CARD_WIDTH, CARD_HEIGHT),
    ] + [
        ("widget_sky_" + name, ambient_stops(colors), CARD_WIDTH, CARD_HEIGHT)
        for name, colors in AMBIENT_KEYFRAME_COLORS.items()
    ]
    for name, stops, width, height in outputs:
        path = os.path.join(OUT_DIR, name + ".png")
        write_png(path, render(stops, width, height))
        print(f"wrote {path} ({os.path.getsize(path) // 1024} KB)")

    # The same six card skies for the iOS widget, at its own size. Names match
    # the Android drawables so both platforms read greppably alike.
    os.makedirs(IOS_OUT_DIR, exist_ok=True)
    root_contents = os.path.join(IOS_OUT_DIR, "Contents.json")
    if not os.path.exists(root_contents):
        with open(root_contents, "w") as f:
            json.dump({"info": {"author": "gen_loading_sky.py", "version": 1}}, f, indent=2)
            f.write("\n")
    ios_outputs = [("widget_sky_dark", DARK_STOPS)] + [
        ("widget_sky_" + name, ambient_stops(colors))
        for name, colors in AMBIENT_KEYFRAME_COLORS.items()
    ]
    for name, stops in ios_outputs:
        imageset_dir = write_imageset(
            name, render(stops, IOS_CARD_WIDTH, IOS_CARD_HEIGHT)
        )
        size = os.path.getsize(os.path.join(imageset_dir, name + ".png"))
        print(f"wrote {imageset_dir} ({size // 1024} KB)")


if __name__ == "__main__":
    main()
