package com.minded.minded.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity
data class Answer(
    @PrimaryKey val uid: Int,
    @ColumnInfo(name = "question_category_id") val questionCategoryId: QuestionCategoryId,
    @ColumnInfo(name = "value") val value: String,
    @ColumnInfo(name = "created_at") var createdAt: Long,
    @ColumnInfo(name = "modified_at") var modifiedAt: Long
)
