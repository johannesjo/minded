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
target size) to extension/ios/App/MindedWidget/Assets.xcassets/, plus the iOS
app's launch sky to extension/ios/App/App/Assets.xcassets/. One generator,
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
# the dither must be applied at (about) the size the launcher will draw. A 3x2
# card on an xxhdpi phone is ~750x540px; at 360x240 the ~2x upscale smeared the
# noise into 2px blobs and let the dark sky's bands creep back. 540x360 keeps
# the same mild ~1.4x upscale the iOS card accepts, for ~80 KB more per face.
CARD_WIDTH = 540
CARD_HEIGHT = 360

# The iOS widget card (WidgetKit systemMedium) draws the same skies at its own
# target size -- up to ~364x170pt (@3x ~1092x510px). Rendering at @2x of the
# largest face keeps the mild-upscale ratio the Android card already accepts
# (its 540-wide PNG draws at up to ~750px), at a quarter of the @3x byte cost.
# shortcut: the seven iOS PNGs still add ~1.2 MB to the app download -- the baked
# dither noise defeats PNG filtering (a clean gradient would be ~2 KB). If
# size ever matters: let the asset catalog store these lossy/HEIF (visually
# safe for noise), or drop to @1x (~45 KB each) and accept upscaled noise.
IOS_OUT_DIR = os.path.join(
    os.path.dirname(__file__),
    "..", "..", "extension", "ios", "App", "MindedWidget", "Assets.xcassets",
)
IOS_CARD_WIDTH = 728
IOS_CARD_HEIGHT = 340

# The iOS app's launch sky (LaunchScreen.storyboard, and the launch overlay
# MainViewController holds until the WebView's first paint): the same two
# full-screen faces as Android's loading_sky_light / loading_sky_dark, at the
# same size - the very skies index.html paints while the bundle loads.
IOS_APP_ASSETS_DIR = os.path.join(
    os.path.dirname(__file__),
    "..", "..", "extension", "ios", "App", "App", "Assets.xcassets",
)
IOS_LAUNCH_SKY = "LaunchSky"

# The widget card's sky steps through the app's ambient time-of-day timeline:
# one render per keyframe, colours verbatim from AMBIENT_SKY_KEYFRAMES in
# extension/src/shared/skyTimeline.ts (keep in sync; WidgetSky.kt picks the
# render for the hour). The 9:00 "morning" keyframe is the classic static sky.
# Stop positions mirror ambientSkyGradient().
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


# Full-screen loading surfaces use the same five keyframes. Compose blends two
# adjacent pre-dithered renders so the native hand-off follows the WebView's
# per-minute interpolation without bringing back runtime-gradient banding.
# Keep the long-standing loading_sky_light name for the morning asset.
FULL_SCREEN_DAY_FACES = [
    (
        "loading_sky_light" if name == "morning" else "loading_sky_" + name,
        ambient_stops(colors),
    )
    for name, colors in AMBIENT_KEYFRAME_COLORS.items()
]


# The night sky's base gradient, cool all the way down. The warm horizon the
# live sky carries in the first hours of night (--night-afterglow in
# _variables.scss) is not in it: the loading skies are one static face each,
# and like the stars the afterglow is a layer only the live sky has. The widget
# card is the exception - it steps through faces anyway, so it gets a second
# night face with the afterglow baked in (NIGHTFALL below).
DARK_STOPS = [
    (0.00, "#02091f"),
    (0.28, "#041238"),
    (0.68, "#0a2860"),
    (0.82, "#123262"),
    (0.92, "#233053"),
    (1.00, "#2b3a63"),
]

# The night composite's two warm layers (_variables.scss, the dark
# --background-gradient), each alpha scaled by --night-afterglow - verbatim, so
# widgetSolarMirror.test.ts can pin them to the stylesheet. The horizon glow is
# an `ellipse 116vmin 32vmin at 50% 112%` radial with these (rgb, alpha, stop)
# stops, fading to transparent at 78%; the band runs from transparent at 88% of
# the height to its colour at the bottom edge.
AFTERGLOW_GLOW = [((117, 54, 44), 0.34, 0.00), ((76, 43, 58), 0.2, 0.46)]
AFTERGLOW_GLOW_END = 0.78
AFTERGLOW_GLOW_RX_VMIN = 1.16
AFTERGLOW_GLOW_RY_VMIN = 0.32
AFTERGLOW_GLOW_CY = 1.12
AFTERGLOW_BAND = ((93, 43, 32), 0.6)
AFTERGLOW_BAND_START = 0.88

# The card's nightfall face: the night sky at this --night-afterglow. The card
# shows it while the live afterglow is >= WidgetSky NIGHTFALL_MIN_AFTERGLOW
# (0.35, Kotlin + Swift) and the plain dark face below that. Two stills stand in
# for a smooth 1 -> 0 drain; baking at ~2/3 with the switch at ~1/3 keeps each
# within ~1/3 of the app's live sky at every minute of the night (nightfall
# spans 1 -> 0.35 around its 0.65; deep night takes over at 0.35 from 0).
NIGHTFALL_AFTERGLOW_LEVEL = 0.65

# The seven widget-card faces, shared by the Android drawables and the iOS
# imagesets -- one list, so a new face can't silently ship on one platform only.
# (name, base stops, baked afterglow).
CARD_FACES = (
    [("widget_sky_dark", DARK_STOPS, 0.0)]
    + [("widget_sky_nightfall", DARK_STOPS, NIGHTFALL_AFTERGLOW_LEVEL)]
    + [
        ("widget_sky_" + name, ambient_stops(colors), 0.0)
        for name, colors in AMBIENT_KEYFRAME_COLORS.items()
    ]
)


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


def over(dst, rgb, alpha):
    """Source-over a straight-alpha layer (alpha: (H, W) or broadcastable)."""
    a = np.clip(alpha, 0.0, 1.0)[..., None]
    return np.asarray(rgb, dtype=float) * a + dst * (1.0 - a)


def afterglow_layers(img, afterglow):
    """
    The night composite's warm layers over `img` at `afterglow`, the way the
    browser paints them: band first, horizon glow on top (the CSS layer order),
    each gradient interpolated premultiplied - towards `transparent` only the
    alpha ramps, the colour holds.

    The glow's `vmin` is the card's own shorter side, not a phone's: the card
    is a landscape surface, so this is the app's sky as it would paint in a
    viewport of the card's shape - the glow pooled on the horizon, as on a
    landscape screen. (On a portrait phone, ~2:1 or taller, that ellipse sits
    wholly below the screen and the band carries the warmth alone. On the card
    the glow adds only a few code values over the band at the bottom centre -
    faithful, if faint.)
    """
    height, width, _ = img.shape
    ys = (np.arange(height) + 0.5) / height
    xs = (np.arange(width) + 0.5) / width

    # Band: 0 above AFTERGLOW_BAND_START, ramping to its alpha at the bottom.
    band_rgb, band_alpha = AFTERGLOW_BAND
    ramp = np.clip((ys - AFTERGLOW_BAND_START) / (1 - AFTERGLOW_BAND_START), 0, 1)
    img = over(img, band_rgb, (band_alpha * afterglow * ramp)[:, None])

    # Glow: the elliptical radius from (50%, 112%), in units of the ellipse.
    vmin = min(width, height)
    rx = AFTERGLOW_GLOW_RX_VMIN * vmin
    ry = AFTERGLOW_GLOW_RY_VMIN * vmin
    dx = (xs[None, :] - 0.5) * width / rx
    dy = (ys[:, None] - AFTERGLOW_GLOW_CY) * height / ry
    t = np.sqrt(dx * dx + dy * dy)
    (c0, a0, p0), (c1, a1, p1) = AFTERGLOW_GLOW
    a0 *= afterglow
    a1 *= afterglow
    c0 = np.asarray(c0, dtype=float)
    c1 = np.asarray(c1, dtype=float)
    # Premultiplied between the two coloured stops...
    u = np.clip((t - p0) / (p1 - p0), 0, 1)[..., None]
    alpha_in = a0 + (a1 - a0) * u[..., 0]
    premul_in = c0 * a0 + (c1 * a1 - c0 * a0) * u
    # ...then the second stop's colour fading to transparent.
    v = np.clip((t - p1) / (AFTERGLOW_GLOW_END - p1), 0, 1)
    alpha_out = a1 * (1 - v)
    alpha = np.where(t <= p1, alpha_in, alpha_out)
    with np.errstate(invalid="ignore", divide="ignore"):
        rgb = np.where(
            (t <= p1)[..., None],
            premul_in / np.maximum(alpha_in, 1e-9)[..., None],
            c1,
        )
    a = alpha[..., None]
    return rgb * a + img * (1 - a)


def render(stops, width=WIDTH, height=HEIGHT, afterglow=0.0):
    rows = gradient_columns(stops, height)  # (H, 3)
    img = np.repeat(rows[:, None, :], width, axis=1)  # (H, W, 3)
    if afterglow > 0:
        img = afterglow_layers(img, afterglow)
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


def write_launch_imageset():
    """
    The iOS launch sky: the morning face for a light system appearance and the
    night face for a dark one. A launch screen is static and can't run the
    app's clock, so the system appearance is the only switch it can read; the
    launch overlay eases into whichever sky the app then paints.
    """
    imageset_dir = os.path.join(IOS_APP_ASSETS_DIR, IOS_LAUNCH_SKY + ".imageset")
    os.makedirs(imageset_dir, exist_ok=True)
    light = IOS_LAUNCH_SKY + ".png"
    dark = IOS_LAUNCH_SKY + "-dark.png"
    write_png(
        os.path.join(imageset_dir, light),
        render(ambient_stops(AMBIENT_KEYFRAME_COLORS["morning"])),
    )
    write_png(os.path.join(imageset_dir, dark), render(DARK_STOPS))
    with open(os.path.join(imageset_dir, "Contents.json"), "w") as f:
        json.dump(
            {
                "images": [
                    {"filename": light, "idiom": "universal"},
                    {
                        "appearances": [
                            {"appearance": "luminosity", "value": "dark"}
                        ],
                        "filename": dark,
                        "idiom": "universal",
                    },
                ],
                "info": {"author": "gen_loading_sky.py", "version": 1},
            },
            f,
            indent=2,
        )
        f.write("\n")
    return imageset_dir


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    outputs = [("loading_sky_dark", DARK_STOPS, WIDTH, HEIGHT)] + [
        (name, stops, WIDTH, HEIGHT) for name, stops in FULL_SCREEN_DAY_FACES
    ] + [(name, stops, CARD_WIDTH, CARD_HEIGHT) for name, stops, _ in CARD_FACES]
    afterglows = {name: afterglow for name, _, afterglow in CARD_FACES}
    for name, stops, width, height in outputs:
        path = os.path.join(OUT_DIR, name + ".png")
        write_png(path, render(stops, width, height, afterglows.get(name, 0.0)))
        print(f"wrote {path} ({os.path.getsize(path) // 1024} KB)")

    # The same seven card skies for the iOS widget, at its own size. Names match
    # the Android drawables so both platforms read greppably alike.
    os.makedirs(IOS_OUT_DIR, exist_ok=True)
    with open(os.path.join(IOS_OUT_DIR, "Contents.json"), "w") as f:
        json.dump({"info": {"author": "gen_loading_sky.py", "version": 1}}, f, indent=2)
        f.write("\n")
    for name, stops, afterglow in CARD_FACES:
        imageset_dir = write_imageset(
            name, render(stops, IOS_CARD_WIDTH, IOS_CARD_HEIGHT, afterglow)
        )
        size = os.path.getsize(os.path.join(imageset_dir, name + ".png"))
        print(f"wrote {imageset_dir} ({size // 1024} KB)")

    print(f"wrote {write_launch_imageset()}")


if __name__ == "__main__":
    main()
