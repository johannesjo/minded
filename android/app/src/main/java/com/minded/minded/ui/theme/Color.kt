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

val LightGradColor1 = Color(0xFFA5DEE5)
val LightGradColor2 = Color(0xFFFFCFDF)
val LightGradColor3 = Color(0xFFFEFDCA)

val DarkGradColor1 = Color(0xFF080c3a)
val DarkGradColor2 = Color(0xFF611177)
val DarkGradColor3 = Color(0xFF873400)

val StandardGradientLight = listOf(
    LightGradColor1,
    LightGradColor2,
    LightGradColor3,
)

val StandardGradientDark = listOf(
    DarkGradColor1,
    DarkGradColor2,
    DarkGradColor3,
)

// Launch/loading sky. Mirrors --background-gradient in
// extension/src/styles/_variables.scss so the native loading screen matches the
// web dashboard's gradient and hands off to it without a colour jump. The stop
// positions match the web gradient's (uneven) percentages exactly, so e.g. the
// dark sky stays deep blue until ~92% and only warms to maroon at the very
// bottom — Brush.verticalGradient(colors=...) would instead space them evenly.
// Light vs. dark is chosen by clock (isDarkModeNow), matching how the web app
// decides. Keep these values + positions in sync with _variables.scss.
// (The web dark gradient also layers a faint radial glow at the bottom centre;
// it's omitted here as the WebView paints the real one within a few frames.)
val AppBgGradientLightStops = arrayOf(
    0.0f to Color(0xFFCFE4F5), // sky blue (top)
    0.18f to Color(0xFFCFE4F5),
    0.36f to Color(0xFFD8ECD6), // soft green
    0.54f to Color(0xFFF5EFC8), // yellow
    1.0f to Color(0xFFF6DCD2), // warm coral (bottom)
)
val AppBgGradientDarkStops = arrayOf(
    0.0f to Color(0xFF02091F),
    0.28f to Color(0xFF041238),
    0.68f to Color(0xFF0A2860),
    0.82f to Color(0xFF123262),
    0.92f to Color(0xFF233053),
    1.0f to Color(0xFF49313B),
)
