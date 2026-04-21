# 🔥 MBG — Widget streaka (iPhone / Apple Watch)

Trzy ścieżki do streaka na nadgarstku — od najszybszej do najpełniejszej.

## Opcja A — Scriptable (iPhone Lock Screen + Home Screen) ⚡ *najszybsza*

1. Zainstaluj **[Scriptable](https://apps.apple.com/app/scriptable/id1405459188)** (darmowa, App Store).
2. Skopiuj `mbg-widget.js` do folderu `iCloud Drive/Scriptable/`.
3. W aplikacji MBG: **Ustawienia → „📲 Skopiuj URL danych widgetu"** (szczegóły niżej).
4. W `mbg-widget.js` wklej ten URL do zmiennej `DATA_URL`.
5. Długi nacisk na ekran główny → **Dodaj widget → Scriptable → wybierz `mbg-widget`**.

Widget pokazuje: 🔥 streak, poziom, XP.

## Opcja B — Komplikacja Apple Watch ⌚

Scriptable nie renderuje komplikacji bezpośrednio. Dwie drogi:

1. **Scriptable na iPhone → Smart Stack** — widget pojawi się w Smart Stacku na Watchu (watchOS 10+) automatycznie, jeśli dodasz go do iPhone'a.
2. **Natywna aplikacja** (Swift) — `StreakComplication.swift` w tym folderze jest punktem wyjścia do pełnej komplikacji. Wymaga Xcode i konta developerskiego.

## Opcja C — Shortcut + Siri „Hej Siri, jaki mam streak?"

1. Apple Shortcuts → **Nowy skrót**.
2. Dodaj akcję *Get Contents of URL* → wklej URL z MBG.
3. *Get Dictionary Value* → klucz `streak`.
4. *Speak text* → „Twój streak to [value] dni".
5. Nazwij skrót „Mój streak" → użyj głosem.

## Skąd wziąć DATA_URL?

MBG zapisuje dane w `localStorage` — nie ma własnego backendu. Są 3 opcje:

1. **GitHub Gist (darmowy, 1 min setup)** — w MBG kliknij „📲 Pobierz dane JSON", wrzuć na [gist.github.com](https://gist.github.com) jako *raw*. URL typu `https://gist.githubusercontent.com/user/abc/raw/data.json`.
2. **Własny host / Dropbox / iCloud Drive** — zapisz plik, użyj publicznego linku.
3. **Shortcut z iCloud Drive** — Apple Shortcut, który czyta plik z iCloud Drive (nie wymaga publicznego URL).

Widget odświeża się automatycznie co ~15-60 min (iOS sam decyduje). Możesz wymusić odświeżenie długim naciśnięciem → „Edit widget" → zamknij.

## Struktura JSON oczekiwana przez widget

```json
{
    "streak": 7,
    "level": 3,
    "points": 425,
    "lastActive": "2026-04-22"
}
```

## Files

- `mbg-widget.js` — kod dla Scriptable.app (iPhone)
- `StreakComplication.swift` — starter natywnej komplikacji watchOS
