import android.content.Context
import android.webkit.JavascriptInterface

class MainActivityJavaScriptInterface(
    private val context: Context,
) {
    private val sharedPreferences = context.getSharedPreferences("mindedData", Context.MODE_PRIVATE)
    val logTag = "MainActivityJavaScriptInterface"

    @JavascriptInterface
    fun saveString(key: String, value: String) {
        with(sharedPreferences.edit()) {
            putString(key, value)
            apply()
        }
    }

    @JavascriptInterface
    fun retrieveString(key: String): String? {
        return sharedPreferences.getString(key, null)
    }
}
