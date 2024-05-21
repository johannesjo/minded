package com.minded.minded.util

import java.time.LocalDate
import java.time.format.DateTimeFormatter

fun getIsoDate(date: LocalDate = LocalDate.now()): String {
    return date.format(DateTimeFormatter.ISO_LOCAL_DATE)
}
