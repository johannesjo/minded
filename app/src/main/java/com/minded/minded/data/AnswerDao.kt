package com.minded.minded.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Update

@Dao
interface AnswerDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insert(answer: Answer)

    @Update
    fun update(answer: Answer)

    fun createWithTimestamp(txtIn: String, questionCategoryId: QuestionCategoryId) {
        val answer = Answer(
            uid = 0, // Room will auto-generate this
            questionCategoryId = questionCategoryId,
            txt = txtIn,
            createdAt = System.currentTimeMillis(),
            modifiedAt = System.currentTimeMillis()
        )
        insert(answer)
    }

    fun insertWithTimestamp(answer: Answer) {
        insert(answer.apply {
            createdAt = System.currentTimeMillis()
            modifiedAt = System.currentTimeMillis()
        })
    }

    fun updateWithTimestamp(answer: Answer) {
        update(answer.apply {
            modifiedAt = System.currentTimeMillis()
        })
    }
}
