package com.minded.minded.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Update

@Dao
interface AnswerDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insert(user: Answer)

    @Update
    fun update(user: Answer)

    fun insertWithTimestamp(user: Answer) {
        insert(user.apply {
            createdAt = System.currentTimeMillis()
            modifiedAt = System.currentTimeMillis()
        })
    }

    fun updateWithTimestamp(user: Answer) {
        update(user.apply {
            modifiedAt = System.currentTimeMillis()
        })
    }
}
