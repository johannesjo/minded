package com.minded.minded.widget

import android.content.Context
import androidx.datastore.core.DataStore
import com.minded.minded.data.answers.Answer
import com.minded.minded.data.answers.AnswerRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class MyWidgetDataStore(private val context: Context) : DataStore<List<Answer>> {
    lateinit var answerRepository: AnswerRepository

    override val data: Flow<List<Answer>>
        get() {
            answerRepository = AnswerRepository(context)
            return flow { emit(answerRepository.getAllAnswers()) }
        }

    override suspend fun updateData(transform: suspend (t: List<Answer>) -> List<Answer>): List<Answer> {
        throw NotImplementedError("Not implemented in Todo Data Store")
    }
}
