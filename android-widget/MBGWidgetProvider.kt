/**
 * MBGWidgetProvider.kt
 * Home-screen widget dla Android pokazujący streak / poziom / XP z MBG.
 *
 * Pobiera JSON z publicznego URL co 30 min i aktualizuje UI widgetu.
 * minSdk 26, Kotlin 1.9+
 *
 * Uproszczony starter — rozbuduj o:
 *  - konfigurację URL przez Activity (`AppWidgetConfigurationActivity`)
 *  - trwały storage URL w SharedPreferences
 *  - ConstraintWorkManager zamiast AlarmManager dla nowoczesnych wersji
 *  - ciemny/jasny motyw via `@android:color/system_accent1_*`
 */

package pl.mbg.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.URL

class MBGWidgetProvider : AppWidgetProvider() {

    companion object {
        // Zmień na swój URL z GitHub Gist / Dropbox / innego hosta
        private const val DATA_URL = "https://gist.githubusercontent.com/YOUR_USER/HASH/raw/mbg-widget-data.json"
        private const val ACTION_REFRESH = "pl.mbg.widget.REFRESH"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onUpdate(context: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { id -> refreshWidget(context, mgr, id) }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, MBGWidgetProvider::class.java))
            ids.forEach { refreshWidget(context, mgr, it) }
        }
    }

    private fun refreshWidget(context: Context, mgr: AppWidgetManager, widgetId: Int) {
        scope.launch {
            val data = fetchData()
            withContext(Dispatchers.Main) {
                val views = RemoteViews(context.packageName, R.layout.mbg_widget_layout).apply {
                    setTextViewText(R.id.streak_num, data.streak.toString())
                    setTextViewText(R.id.level_num, "LVL ${data.level}")
                    setTextViewText(R.id.points_num, "${data.points} XP")
                    setOnClickPendingIntent(R.id.widget_root, buildRefreshIntent(context))
                }
                mgr.updateAppWidget(widgetId, views)
            }
        }
    }

    private fun buildRefreshIntent(context: Context): PendingIntent {
        val intent = Intent(context, MBGWidgetProvider::class.java).apply { action = ACTION_REFRESH }
        return PendingIntent.getBroadcast(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /**
     * Pobierz JSON z publicznego URL. Timeout 8s.
     * W produkcji → użyj OkHttp + cache + retry logic.
     */
    private fun fetchData(): MBGData = try {
        val text = URL(DATA_URL).openConnection().apply {
            connectTimeout = 8000
            readTimeout = 8000
        }.getInputStream().bufferedReader().use { it.readText() }

        val json = JSONObject(text)
        MBGData(
            streak = json.optInt("streak", 0),
            level  = json.optInt("level", 1),
            points = json.optInt("points", 0)
        )
    } catch (e: Exception) {
        MBGData(streak = 0, level = 1, points = 0)
    }

    data class MBGData(val streak: Int, val level: Int, val points: Int)
}
