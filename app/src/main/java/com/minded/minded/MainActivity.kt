package com.minded.minded

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.minded.minded.ui.theme.MindedTheme


class MainActivity : AppCompatActivity() {
    private val SYSTEM_ALERT_WINDOW_PERMISSION = 2084
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.v("MAIN", "ON_CREATE MAIN ACTIVITY")

        startService(Intent(this, FloatingWidgetService::class.java))
//        startService(Intent(this, com.minded.minded.FloatingWidgetService::class.java))

        setContent {
            MindedTheme {
                // A surface container using the 'background' color from the theme
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    Greeting("AndrAAaaaaAoid")
                }
            }
        }

        if (Settings.canDrawOverlays(this)) {
            Toast.makeText(
                this,
                "START SERVICE",
                Toast.LENGTH_SHORT
            ).show()
//            startService(Intent(this, FloatingWidgetService::class.java))
//            finish()
        } else {
            Toast.makeText(
                this,
                "You need System Alert Window Permission to do this",
                Toast.LENGTH_SHORT
            ).show()
            askPermission()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == SYSTEM_ALERT_WINDOW_PERMISSION) {
            if (Settings.canDrawOverlays(this)) {
                startService(Intent(this, FloatingWidgetService::class.java))
            } else {
                Toast.makeText(this, "Permission not granted", Toast.LENGTH_SHORT).show()
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }

    private fun askPermission() {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:$packageName")
        )
        startActivityForResult(intent, SYSTEM_ALERT_WINDOW_PERMISSION)
    }
}

@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
    Text(
        text = "Hello $name!",
        modifier = modifier
    )
}

@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    MindedTheme {
        Greeting("Android")
    }
}
