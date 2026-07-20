package com.minded.minded.ui.theme
import androidx.compose.ui.graphics.Color

val Purple80 = Color(0xFFD0BCFF)
val PurpleGrey80 = Color(0xFFCCC2DC)
val Pink80 = Color(0xFFEFB8C8)

val Purple40 = Color(0xFF6650a4)
val PurpleGrey40 = Color(0xFF625b71)
val Pink40 = Color(0xFF7D5260)

val PastelGreen = Color(0xFFB7E4C7)
val PastelRed = Color(0xFFE4B7B7)
val PastelYellow = Color(0xFFE4E0B7)

// Sky gradient stops mirrored from --c-gradient-1..4 (light) and
// --c-gradient-1..3 (dark) in extension/src/styles/_variables.scss. The light
// stops are the classic "morning" sky, which the web's living time-of-day
// timeline (skyTimeline.ts) keeps as its anchor keyframe; if the living sky
// ever comes to Android, these become time-aware.
val LightGradColor1 = Color(0xFFCFE4F5)
val LightGradColor2 = Color(0xFFD8ECD6)
val LightGradColor3 = Color(0xFFF5EFC8)
val LightGradColor4 = Color(0xFFF6DCD2)

val DarkGradColor1 = Color(0xFF02091F)
val DarkGradColor2 = Color(0xFF0A2860)
val DarkGradColor3 = Color(0xFF49313B)

// Sky-family accents for native surfaces: the pause dim leans into the
// deep-night sky instead of flat black, and the toast glow echoes the sun's
// warm amber accent.
val NightSkyDim = DarkGradColor1
val WarmAmberGlow = Color(0x73FFB24F)

val StandardGradientLight = listOf(
    LightGradColor1,
    LightGradColor2,
    LightGradColor3,
    LightGradColor4,
)

val StandardGradientDark = listOf(
    DarkGradColor1,
    DarkGradColor2,
    DarkGradColor3,
)

// The launch/loading sky (matching --background-gradient in
// extension/src/styles/_variables.scss) is no longer a runtime gradient: an
// 8-bit <shape>/Brush gradient banded into visible "lines" on the near-flat
// dark sky. It now ships as a pre-dithered bitmap (loading_sky_{light,dark}),
// generated from the same stops by android/tools/gen_loading_sky.py.
