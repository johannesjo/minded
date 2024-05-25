package com.minded.minded

import android.app.Activity
import android.graphics.Rect
import android.webkit.WebView
import android.content.Context
import android.util.Log

class MyWebView(context: Context) : WebView(context) {
    val htmlClass = "androidKeyboardOpen"
    // ...
    private var isKeyboardShowing = false
    private val r = Rect()

    init {
        setupKeyboardListener()
    }

    fun setupKeyboardListener() {
        val contentView = (context as Activity).window.decorView.rootView

        contentView.viewTreeObserver.addOnGlobalLayoutListener {
            contentView.getWindowVisibleDisplayFrame(r)
            val screenHeight = contentView.rootView.height

            val keypadHeight: Int = screenHeight - r.bottom
            if (keypadHeight > screenHeight * 0.15) {
                // keyboard is opened
                if (!isKeyboardShowing) {
                    isKeyboardShowing = true
                    onKeyboardVisibilityChanged(true)
                }
            } else {
                // keyboard is closed
                if (isKeyboardShowing) {
                    isKeyboardShowing = false
                    onKeyboardVisibilityChanged(false)
                }
            }
        }
    }

    private fun onKeyboardVisibilityChanged(opened: Boolean) {
        Log.v("MyWebView", "Keyboard opened: $opened")
        if (opened) {
            this.loadUrl("javascript:document.body.classList.add('$htmlClass')")
        } else {
            this.loadUrl("javascript:document.body.classList.remove('$htmlClass')")
        }
    }
}

//androidKeyboardOpen
