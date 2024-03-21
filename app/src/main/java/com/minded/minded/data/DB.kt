package com.minded.minded.data

import androidx.room.Database
import androidx.room.RoomDatabase
import com.minded.minded.data.answers.Answer
import com.minded.minded.data.answers.AnswerDao

@Database(entities = [Answer::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun answerDao(): AnswerDao
}
