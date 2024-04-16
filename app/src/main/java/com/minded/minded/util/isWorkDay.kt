package com.minded.minded.util

import java.util.Calendar

fun isWorkDay(calendar: Calendar = Calendar.getInstance()): Boolean {
    val dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK)
    return dayOfWeek != Calendar.SATURDAY && dayOfWeek != Calendar.SUNDAY
}
