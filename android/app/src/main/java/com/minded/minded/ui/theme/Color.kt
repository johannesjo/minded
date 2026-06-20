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
// web dashboard's gradient and hands off to it without a colour jump. Light vs.
// dark is chosen by clock (isDarkModeNow), matching how the web app decides.
// Keep these values in sync with _variables.scss.
val AppBgGradientLight = listOf(
    Color(0xFFCFE4F5), // sky blue (top)
    Color(0xFFD8ECD6), // soft green
    Color(0xFFF5EFC8), // yellow
    Color(0xFFF6DCD2), // warm coral (bottom)
)
val AppBgGradientDark = listOf(
    Color(0xFF02091F),
    Color(0xFF041238),
    Color(0xFF0A2860),
    Color(0xFF123262),
    Color(0xFF233053),
    Color(0xFF49313B),
)
