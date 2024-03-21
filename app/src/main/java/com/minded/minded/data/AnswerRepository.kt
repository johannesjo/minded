package com.minded.minded.data

import android.content.Context
import androidx.room.Room
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AnswerRepository(context: Context) {
    private val answerDao: AnswerDao

    init {
        val database = Room.databaseBuilder(context, AppDatabase::class.java, "minded-db").build()
        answerDao = database.answerDao()
    }

    suspend fun getAllAnswers(): List<Answer> {
        return withContext(Dispatchers.IO) {
            answerDao.getAllAnswers()
        }
    }

    suspend fun createWithTimestamp(txtIn: String, questionCategoryId: QuestionCategoryId) {
        return withContext(Dispatchers.IO) {
            answerDao.createWithTimestamp(txtIn, questionCategoryId)
        }
    }
}
