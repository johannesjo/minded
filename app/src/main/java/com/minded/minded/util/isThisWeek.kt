package com.minded.minded.util

import java.util.Calendar
import java.util.Date

fun isThisWeek(ts: Long): Boolean {
    val date = Date(ts)
    val currentCalendar = Calendar.getInstance()
    val week = currentCalendar.get(Calendar.WEEK_OF_YEAR)
    val year = currentCalendar.get(Calendar.YEAR)

    val targetCalendar = Calendar.getInstance()
    targetCalendar.time = date
    val targetWeek = targetCalendar.get(Calendar.WEEK_OF_YEAR)
    val targetYear = targetCalendar.get(Calendar.YEAR)

    return week == targetWeek && year == targetYear
}
