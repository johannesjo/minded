package com.minded.minded.data.answers

import android.content.Context
import androidx.room.Room
import com.minded.minded.data.AppDatabase
import com.minded.minded.data.QuestionCategoryId
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext

class AnswerRepository(context: Context) {
    private val answerDao: AnswerDao

    init {
        val database = Room.databaseBuilder(context, AppDatabase::class.java, "minded-db")
            // TODO remove for production
            .fallbackToDestructiveMigration()
            .build()
        answerDao = database.answerDao()
    }

    suspend fun getAllAnswers(): List<Answer> {
        return withContext(Dispatchers.IO) {
            answerDao.getAllAnswers()
        }
    }

    fun getAllAnswersFlow(): Flow<List<Answer>> {
        return answerDao.getAllAnswersFlow()
    }

    suspend fun createWithTimestamp(
        txtIn: String,
        questionCategoryId: QuestionCategoryId,
        questionId: String
    ) {
        return answerDao.createWithTimestamp(txtIn, questionCategoryId, questionId)
    }

    suspend fun removeAnswer(answer: Answer) {
        return answerDao.remove(answer)
    }
}
