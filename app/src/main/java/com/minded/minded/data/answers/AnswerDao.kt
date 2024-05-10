package com.minded.minded.data.answers

import android.util.Log
import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.minded.minded.data.QuestionCategoryId
import kotlinx.coroutines.flow.Flow

@Dao
interface AnswerDao {
    @Query("SELECT * FROM Answer")
    fun getAllAnswers(): List<Answer>

    @Query("SELECT * FROM Answer")
    fun getAllAnswersFlow(): Flow<List<Answer>>


    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(answer: Answer)

    @Update
    suspend fun update(answer: Answer)

    suspend fun createWithTimestamp(
        txtIn: String,
        questionCategoryId: QuestionCategoryId,
        questionId: String
    ) {
        Log.v("aa", txtIn)
        val answer = Answer(
            uid = 0, // Room will auto-generate this
            questionCategoryId = questionCategoryId,
            txt = txtIn,
            questionId = questionId,
            createdAt = System.currentTimeMillis(),
            modifiedAt = System.currentTimeMillis()
        )
        insert(answer)
    }

    @Delete
    suspend fun remove(answer: Answer)
}
