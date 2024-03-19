package com.minded.minded.data

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [Answer::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun answerDao(): AnswerDao
}
