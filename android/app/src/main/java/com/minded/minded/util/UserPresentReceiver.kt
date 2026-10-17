package com.minded.minded.util

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build

/**
 * Register [receiver] for ACTION_USER_PRESENT (the unlock). It must be
 * RECEIVER_EXPORTED, unlike SCREEN_ON/OFF: USER_PRESENT is sent by SystemUI
 * (KeyguardViewMediator), which runs under its own app UID rather than the
 * system's, and BroadcastSkipPolicy drops any broadcast to a not-exported
 * receiver unless the sender is system/root or the app itself ("Exported
 * Denial"). With RECEIVER_NOT_EXPORTED it never arrives on API 33+ - the
 * mindfulness bell's on-device trace showed exactly that. Exporting is safe:
 * USER_PRESENT is a protected broadcast no app can send.
 *
 * Keep it in its own receiver: don't fold it back into a not-exported filter.
 */
fun registerUserPresentReceiver(context: Context, receiver: BroadcastReceiver) {
    val filter = IntentFilter(Intent.ACTION_USER_PRESENT)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        context.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
    } else {
        context.registerReceiver(receiver, filter)
    }
}
