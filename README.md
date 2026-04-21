# ⚡ Motywacja bez granic (MBG)

Nowoczesna aplikacja webowa do budowania dyscypliny, focus time i nawyków. **PWA** — działa offline, instaluje się jako natywna aplikacja na Androidzie/iOS, obsługuje powiadomienia push.

## 🎯 Funkcje

- **Zadania** z priorytetami XP (10 / 25 / 50 / 100) + widok kalendarza miesięcznego
- **Timer sesji focus** z automatycznym logowaniem aktywności
- **Dziennik** z pickerem nastroju (+XP za refleksję)
- **Gamifikacja** — poziomy, XP, streaki, 16 osiągnięć, animacje level-up
- **Nawyki** — grid 14-dniowy per nawyk, streak per nawyk, 3 pory dnia
- **Hydration tracker** — 8 slotów z motywacyjnymi etykietami (7:00 → 21:00), 2L/dzień
- **Heatmap konsekwencji** (GitHub-style) za ostatnie 13 tygodni
- **Wyzwania** 7/21/30 dni z bonusem +500 XP
- **Tryb Focus** — fullscreen blokujący rozpraszacze
- **Statystyki** — Chart.js, analiza "AI" wzorców produktywności
- **Eksport/import** wszystkich danych (JSON)
- **Kalendarz** z widokiem Dziś/Jutro/Pojutrze, lista zaplanowanych zadań z countdownem

## 🚀 Uruchomienie

**Live:** po deploy na GitHub Pages / Netlify — link jest w opisie repo.

**Lokalnie:**
```bash
python -m http.server 8000
# otwórz http://localhost:8000
```

## 📲 Instalacja na telefonie

- **Android (Chrome/Edge):** otwórz URL → menu ⋮ → „Zainstaluj aplikację"
- **iOS (Safari):** otwórz URL → ⬆️ → „Dodaj do ekranu głównego"

PWA działa offline, z powiadomieniami, skrótami (długi nacisk na ikonę).

## ⌚ Widgety (streak na ekranie głównym / zegarku)

- **iOS / Apple Watch:** zobacz [watch-widget/README.md](watch-widget/README.md) — Scriptable, Siri Shortcut, natywna komplikacja Swift
- **Android / Wear OS:** zobacz [android-widget/README.md](android-widget/README.md) — KWGT, natywny Kotlin AppWidget, Wear OS Tile

## 🏗️ Technologia

Czysty stack, zero buildstepu, zero zależności npm:
- Vanilla HTML / CSS / JavaScript
- Chart.js (CDN) do wykresów
- `localStorage` do persystencji
- Service Worker dla offline + push
- Web App Manifest dla instalacji

## 📦 Struktura

```
├── index.html              — UI (9 widoków, modale)
├── style.css               — dark mode, gradient, animacje
├── script.js               — cała logika (persystencja, gamifikacja, kalendarz)
├── manifest.json           — PWA manifest
├── sw.js                   — service worker (offline + push)
├── icon.svg / icon-maskable.svg
├── watch-widget/           — iOS/Apple Watch
└── android-widget/         — Android/Wear OS
```

## 📄 Licencja

MIT
