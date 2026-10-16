#!/usr/bin/env python3
"""
Pins the app's own Newsreader (the serif the app speaks in - displayVoice())
into a static TTF the iOS widget can bundle.

The web ships Newsreader as a latin-subset *variable* WOFF2
(extension/src/assets/fonts/newsreader-latin-variable.woff2); iOS can't
register WOFF2 from UIAppFonts, and a widget only ever draws one weight at one
small size. So: instance it at the voice's weight (400, displayVoice) and the
optical size the card reads at (16), rename it so it registers as
"Newsreader-Regular", and write a TTF next to the widget sources. One source of
truth for the glyphs - re-run after refreshing the web font.

    pip install fonttools brotli
    python3 extension/ios/App/scripts/gen_widget_font.py
"""
import os

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "..", "src", "assets", "fonts", "newsreader-latin-variable.woff2")
OUT = os.path.join(HERE, "..", "MindedWidget", "Newsreader-Regular.ttf")

font = TTFont(SRC)
static = instantiateVariableFont(font, {"wght": 400, "opsz": 16})
static.flavor = None  # WOFF2 -> plain TrueType
names = static["name"]
for record in list(names.names):
    if record.nameID in (1, 2, 3, 4, 6, 16, 17):
        names.removeNames(nameID=record.nameID)
for name_id, value in (
    (1, "Newsreader"),
    (2, "Regular"),
    (3, "Newsreader-Regular-minded-widget"),
    (4, "Newsreader Regular"),
    (6, "Newsreader-Regular"),
):
    names.setName(value, name_id, 3, 1, 0x409)
    names.setName(value, name_id, 1, 0, 0)
static.save(OUT)
print(f"wrote {OUT} ({os.path.getsize(OUT) // 1024} KB)")
