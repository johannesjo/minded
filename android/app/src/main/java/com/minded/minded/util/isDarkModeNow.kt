package com.minded.minded.util

import java.util.Calendar

val DARK_MODE_START_HOUR = 19
val DARK_MODE_END_HOUR = 6

fun isDarkModeNow(): Boolean {
    val now = Calendar.getInstance()
    val nowHours = now.get(Calendar.HOUR_OF_DAY)

    return nowHours >= DARK_MODE_START_HOUR || nowHours < DARK_MODE_END_HOUR
}
