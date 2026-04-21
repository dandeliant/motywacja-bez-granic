# 🤖 MBG — Android (PWA + Widget + Wear OS)

Na Androidzie masz **4 ścieżki** — od zero-code po natywną aplikację.

---

## 🟢 Opcja A — PWA (zero setup, działa już teraz)

Aplikacja MBG jest pełnoprawnym PWA. Na Androidzie to oznacza **WebAPK** — realny pakiet aplikacji w systemie.

**Instalacja:**
1. Otwórz `index.html` w Chrome / Edge / Samsung Internet
2. Pojawi się przycisk **„📲 Zainstaluj aplikację"** w lewym pasku
3. Chrome wygeneruje WebAPK — ikona ląduje na ekranie głównym jak natywna appka

**Co dostajesz:**
- Pełnoekranowy tryb (bez paska przeglądarki)
- Praca offline (service worker cache)
- Powiadomienia push
- Shortcuts (długi nacisk na ikonę → Timer / Zadanie / Dziennik)
- Integracja z systemem (pojawia się w menu „ostatnie aplikacje", w ustawieniach jako osobna app)

**Co NIE dostajesz bez opcji B/C/D:**
- Widget na ekranie głównym (Android nie pozwala PWA na widgety)
- Komplikacja / Tile na Wear OS

---

## 🟡 Opcja B — KWGT / KLWP (widget, zero kodu) ⚡ *rekomendowane*

**[KWGT Kustom Widget Maker](https://play.google.com/store/apps/details?id=org.kustom.widget)** — darmowa wersja wystarcza.

**Setup (3 minuty):**
1. W MBG: **Ustawienia → „📲 Pobierz dane dla widgetu"** — pobiera `mbg-widget-data.json`.
2. Wrzuć plik na [gist.github.com](https://gist.github.com) jako *raw* lub dowolny publiczny host (Dropbox/Google Drive z public linkiem).
3. Skopiuj *raw URL*, np. `https://gist.githubusercontent.com/user/abc/raw/mbg.json`.
4. Zainstaluj KWGT, dodaj widget na ekran główny.
5. Otwórz edytor KWGT → **Globals → Add Global → Text** → nazwa `data_url`, wartość = twój URL.
6. Dodaj komponent **Text** z formułą:

```
$wg(gv(data_url), json, streak)$
```

…i voilà — live streak na ekranie głównym. Pełny przykład formuły w `kwgt-formulas.txt` w tym folderze.

**Alternatywa: [Widgy](https://play.google.com/store/apps/details?id=com.widgy.widget)** — działa identycznie, ładniejszy UI edytora.

---

## 🔵 Opcja C — Natywny Android Widget (Kotlin) 💪 *najlepsza UX*

Punkt wyjścia w pliku `MBGWidgetProvider.kt` w tym folderze.

**Wymagania:**
- Android Studio (Jellyfish+)
- JDK 17+
- Kotlin 1.9+
- `minSdk 26`, `targetSdk 34`

**Co zawiera starter:**
- `MBGWidgetProvider.kt` — `AppWidgetProvider` pobierający JSON z URL i aktualizujący widget co 30 min
- `mbg_widget_layout.xml` — layout widgetu (streak + level + XP) w stylu MBG dark
- `mbg_widget_info.xml` — metadane widgetu (rozmiar, podgląd, klasa providera)
- `AndroidManifest.xml` snippet — rejestracja providera

**Build:**
```bash
./gradlew :widget:assembleDebug
adb install widget/build/outputs/apk/debug/widget-debug.apk
```

Po instalacji długi nacisk na ekran główny → Widgets → MBG Streak.

---

## ⌚ Opcja D — Wear OS Tile (Android smartwatch)

Plik `WearOSTile.kt` to starter **Tile** dla zegarka z Wear OS 3+.

**Różnica vs Apple Watch:**
- Wear OS nie ma „komplikacji" — ma **Tiles** (kafelki, swipe od tarczy)
- Tiles mogą być aktualizowane w tle co ~20 min
- Możesz dodać też **Complication** (kółko na tarczy) przez `ComplicationDataSourceService`

**Build:**
```bash
./gradlew :wear:installDebug
```

Na zegarku: długi nacisk tarczę → Dodaj kafelek → MBG Streak.

---

## 🔔 Push notifications (bonus)

PWA na Androidzie **bez żadnego dodatkowego kodu** obsługuje Web Push.
- Zgoda: **Ustawienia → Włącz przypomnienia**
- Service worker (`sw.js`) nasłuchuje eventów `push` i pokazuje powiadomienie
- Chrome używa **Firebase Cloud Messaging (FCM)** pod spodem — darmowe, bez rejestracji
- Żeby wysyłać powiadomienia z backendu → zarejestruj klucze VAPID i serwer push

---

## 🔗 Plik danych — źródło prawdy dla wszystkich widgetów

Widget pobiera JSON z publicznego URL. Struktura:

```json
{
    "streak": 7,
    "level": 3,
    "points": 425,
    "xp": 600,
    "lastActive": "2026-04-22",
    "updatedAt": "2026-04-22T10:30:00Z"
}
```

**Gdzie hostować:**
- **GitHub Gist** — darmowe, 30 sek setup, raw URL
- **Dropbox/Google Drive** — share link z `?dl=1` na końcu
- **Własny VPS** — pełna kontrola, możesz automatyzować
- **Netlify / Vercel / GitHub Pages** — hostuj plik statycznie

Żeby aktualizować dane *automatycznie* → w przyszłości MBG może dostać backend (Supabase / Firebase), wtedy widget odczytuje live. Dziś — ręczny eksport po każdej ważnej zmianie.

---

## 📂 Pliki w tym folderze

| Plik | Opis |
|---|---|
| `MBGWidgetProvider.kt` | Natywny AppWidgetProvider (Kotlin) |
| `mbg_widget_layout.xml` | Layout widgetu |
| `mbg_widget_info.xml` | Metadane widgetu |
| `AndroidManifest_snippet.xml` | Fragment manifestu do wklejenia |
| `WearOSTile.kt` | Starter Wear OS Tile |
| `kwgt-formulas.txt` | Gotowe formuły dla KWGT |
