package com.minded.minded.util

import com.minded.minded.data.QuestionCategoryId
import com.minded.minded.data.QuestionForPrompt
import org.json.JSONObject

fun parseJSONQuestion(jsonString: String): QuestionForPrompt {
    val jsonObject = JSONObject(jsonString)
    return parseQuestionFromJSONObject(jsonObject)
}

fun parseQuestionFromJSONObject(jsonObject: JSONObject): QuestionForPrompt {
    val t = jsonObject.getString("t")
    val prompt = jsonObject.optString("prompt", null)
    val categoryId = QuestionCategoryId.valueOf(jsonObject.getString("categoryId"))
    val questionID = jsonObject.getString("id")
    return QuestionForPrompt(questionID, categoryId, t, prompt)
}
