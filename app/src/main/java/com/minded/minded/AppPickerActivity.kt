package com.minded.minded

import android.content.Context
import android.content.SharedPreferences
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.minded.minded.ui.compose.AppPickerScreen

class AppPickerActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AppPickerScreen()
        }
    }

    fun getSettings(): SharedPreferences {
        return this.getPreferences(Context.MODE_PRIVATE)
    }
}
