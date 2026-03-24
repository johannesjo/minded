package com.minded.minded.util

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.WeekFields

fun isThisWeek(ts: Long): Boolean {
    val date = Instant.ofEpochMilli(ts).atZone(ZoneId.systemDefault()).toLocalDate()
    val today = LocalDate.now()
    val weekFields = WeekFields.ISO
    return date.get(weekFields.weekOfWeekBasedYear()) == today.get(weekFields.weekOfWeekBasedYear()) &&
           date.get(weekFields.weekBasedYear()) == today.get(weekFields.weekBasedYear())
}
