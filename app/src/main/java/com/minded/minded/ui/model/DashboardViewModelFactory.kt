package com.minded.minded.ui.model

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.minded.minded.data.answers.AnswerRepository

class DashboardViewModelFactory(private val answerRepository: AnswerRepository) :
    ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        Log.v("MAIN", "Creating ViewModel")
        if (modelClass.isAssignableFrom(DashboardViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return DashboardViewModel(answerRepository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
