//
//  StreakComplication.swift
//  MBG Watch — natywna komplikacja Apple Watch
//
//  Punkt wyjścia do pełnej komplikacji watchOS (wymaga Xcode, konta dev,
//  parowania z aplikacją iPhone). Używa WidgetKit + ClockKit.
//
//  Wymagania: watchOS 10+, Swift 5.9+
//

import WidgetKit
import SwiftUI

// ===== MODEL DANYCH =====
struct StreakEntry: TimelineEntry {
    let date: Date
    let streak: Int
    let level: Int
    let points: Int
}

// ===== PROVIDER (źródło danych) =====
struct StreakProvider: TimelineProvider {

    func placeholder(in context: Context) -> StreakEntry {
        StreakEntry(date: Date(), streak: 7, level: 3, points: 425)
    }

    func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> Void) {
        completion(fetchEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
        // Odświeżaj co 30 min
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [fetchEntry()], policy: .after(next)))
    }

    // Odczyt danych z shared App Group — aplikacja iPhone zapisuje je
    // przez WidgetCenter.shared.reloadAllTimelines() po każdej zmianie streaka.
    private func fetchEntry() -> StreakEntry {
        let defaults = UserDefaults(suiteName: "group.pl.mbg.shared")
        return StreakEntry(
            date: Date(),
            streak: defaults?.integer(forKey: "streak") ?? 0,
            level:  defaults?.integer(forKey: "level")  ?? 1,
            points: defaults?.integer(forKey: "points") ?? 0
        )
    }
}

// ===== WIDOK KOMPLIKACJI =====
struct StreakComplicationView: View {
    var entry: StreakProvider.Entry

    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            // Tarcza — okrągła komplikacja
            ZStack {
                Circle().stroke(.orange.opacity(0.3), lineWidth: 3)
                VStack(spacing: 0) {
                    Text("🔥").font(.system(size: 12))
                    Text("\(entry.streak)").font(.system(size: 18, weight: .bold))
                }
            }
        case .accessoryRectangular:
            // Prostokątna komplikacja
            HStack {
                Text("🔥").font(.title2)
                VStack(alignment: .leading) {
                    Text("\(entry.streak) dni").font(.headline)
                    Text("LVL \(entry.level) • \(entry.points) XP").font(.caption2)
                }
            }
        case .accessoryInline:
            Text("🔥 \(entry.streak) dni")
        default:
            VStack {
                Text("🔥 \(entry.streak)").font(.largeTitle.bold())
                Text("dni z rzędu").font(.caption)
            }
        }
    }
}

// ===== KONFIGURACJA WIDGET KIT =====
@main
struct MBGStreakComplication: Widget {
    let kind = "MBGStreakComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StreakProvider()) { entry in
            StreakComplicationView(entry: entry)
        }
        .configurationDisplayName("MBG Streak")
        .description("Twój streak MBG na tarczy.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}
