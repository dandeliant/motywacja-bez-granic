/**
 * WearOSTile.kt
 * Tile (kafelek) dla Wear OS 3+ pokazujący streak MBG na zegarku.
 *
 * Tiles to odpowiednik komplikacji Apple Watch — kafelki dostępne przez
 * swipe od tarczy. Android nie pozwala PWA instalować się bezpośrednio
 * na Wear OS, więc jeśli chcesz coś na ręce — musisz zrobić natywnie.
 *
 * Wymagania:
 *   - implementation "androidx.wear.tiles:tiles:1.4.0"
 *   - implementation "androidx.wear.tiles:tiles-material:1.4.0"
 *   - implementation "androidx.wear.protolayout:protolayout:1.2.0"
 *   - implementation "androidx.wear.protolayout:protolayout-material:1.2.0"
 *   - minSdk 26 (Wear OS 3)
 */

package pl.mbg.wear

import android.content.Context
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.LayoutElementBuilders.Column
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.protolayout.material.Colors
import androidx.wear.protolayout.material.Text
import androidx.wear.protolayout.material.Typography
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.future.future
import org.json.JSONObject
import java.net.URL

class MBGStreakTile : TileService() {

    companion object {
        private const val DATA_URL = "https://gist.githubusercontent.com/YOUR_USER/HASH/raw/mbg.json"
        private const val RESOURCES_VERSION = "1"
        private const val REFRESH_MS = 20 * 60 * 1000L // 20 min
    }

    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> =
        GlobalScope.future(Dispatchers.IO) {
            val data = fetchData()
            val layout = Column.Builder()
                .addContent(
                    Text.Builder(applicationContext, "🔥 ${data.streak}")
                        .setTypography(Typography.TYPOGRAPHY_DISPLAY1)
                        .setColor(argb(0xFFEF4444.toInt()))
                        .build()
                )
                .addContent(
                    Text.Builder(applicationContext, "dni z rzędu")
                        .setTypography(Typography.TYPOGRAPHY_CAPTION1)
                        .setColor(argb(0xFF8B95A7.toInt()))
                        .build()
                )
                .addContent(
                    Text.Builder(applicationContext, "LVL ${data.level} • ${data.points} XP")
                        .setTypography(Typography.TYPOGRAPHY_BODY2)
                        .setColor(argb(0xFF6366F1.toInt()))
                        .build()
                )
                .build()

            val timeline = TimelineBuilders.Timeline.Builder()
                .addTimelineEntry(
                    TimelineBuilders.TimelineEntry.Builder()
                        .setLayout(
                            androidx.wear.protolayout.LayoutElementBuilders.Layout.Builder()
                                .setRoot(layout)
                                .build()
                        )
                        .build()
                ).build()

            TileBuilders.Tile.Builder()
                .setResourcesVersion(RESOURCES_VERSION)
                .setTileTimeline(timeline)
                .setFreshnessIntervalMillis(REFRESH_MS)
                .build()
        }

    override fun onTileResourcesRequest(p: RequestBuilders.ResourcesRequest): ListenableFuture<ResourceBuilders.Resources> =
        Futures.immediateFuture(
            ResourceBuilders.Resources.Builder().setVersion(RESOURCES_VERSION).build()
        )

    private fun fetchData(): TileData = try {
        val text = URL(DATA_URL).openConnection().apply {
            connectTimeout = 6000
            readTimeout = 6000
        }.getInputStream().bufferedReader().use { it.readText() }
        val j = JSONObject(text)
        TileData(j.optInt("streak"), j.optInt("level", 1), j.optInt("points"))
    } catch (_: Exception) {
        TileData(0, 1, 0)
    }

    data class TileData(val streak: Int, val level: Int, val points: Int)
}
