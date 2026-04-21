/* =====================================================================
 * MBG — WIDGET STREAKA (Scriptable.app)
 * =====================================================================
 * Kompaktowy widget dla iPhone (Lock Screen + Home Screen) i Apple Watch.
 *
 * WYMAGANIA:
 *   - Zainstalowana aplikacja Scriptable.app (darmowa, App Store)
 *   - Dla Apple Watch: dodanie komplikacji przez tarczę → Scriptable
 *
 * KONFIGURACJA:
 *   1. Skopiuj ten plik do Scriptable (iCloud Drive/Scriptable/)
 *   2. W głównej aplikacji MBG otwórz: Ustawienia → "📲 Widget — skopiuj URL"
 *   3. Wklej URL do zmiennej DATA_URL poniżej
 *   4. Dodaj widget: długi nacisk na ekran główny → Scriptable → wybierz ten skrypt
 *
 * JAK DZIAŁA:
 *   - Aplikacja MBG generuje publiczny URL z danymi (base64 w hashu)
 *   - Widget pobiera streak/level/xp i wyświetla na tarczy/Lock Screen
 *   - Odświeżanie: iOS robi to automatycznie co ~15-60 min
 * =====================================================================
 */

// === USER CONFIG ===
const DATA_URL = ''; // np. 'https://twoj-host.pl/mbg-data.json' — wygenerowany z ustawień MBG
const USER_NAME = ''; // opcjonalnie, np. "Piotr" — wyświetli się jako greeting

// === KOLORY (dark mode jak w głównej aplikacji) ===
const COLORS = {
    bg: new Color('#0a0e1a'),
    accent: new Color('#6366f1'),
    fire: new Color('#ef4444'),
    gold: new Color('#fbbf24'),
    text: new Color('#e6edf3'),
    dim: new Color('#8b95a7')
};

// === POBIERANIE DANYCH ===
async function fetchData() {
    if (!DATA_URL) return null;
    try {
        const req = new Request(DATA_URL);
        req.timeoutInterval = 8;
        return await req.loadJSON();
    } catch (e) {
        return null;
    }
}

// === WIDOK WIDGETU ===
async function createWidget() {
    const w = new ListWidget();
    w.backgroundGradient = makeGradient();
    w.setPadding(14, 14, 14, 14);

    const data = (await fetchData()) || demoData();

    // Nagłówek — logo + nazwa
    const header = w.addStack();
    header.centerAlignContent();
    const logo = header.addText('⚡');
    logo.font = Font.boldSystemFont(16);
    header.addSpacer(6);
    const name = header.addText('MBG');
    name.font = Font.boldSystemFont(12);
    name.textColor = COLORS.text;

    w.addSpacer(8);

    // Streak — centralna liczba
    const streakRow = w.addStack();
    streakRow.centerAlignContent();
    const fire = streakRow.addText('🔥');
    fire.font = Font.systemFont(30);
    streakRow.addSpacer(6);
    const streakNum = streakRow.addText(String(data.streak));
    streakNum.font = Font.boldSystemFont(44);
    streakNum.textColor = COLORS.fire;

    const daysLabel = w.addText('dni z rzędu');
    daysLabel.font = Font.systemFont(11);
    daysLabel.textColor = COLORS.dim;

    w.addSpacer(8);

    // Level + XP
    const statsRow = w.addStack();
    statsRow.spacing = 10;

    const lvlStack = statsRow.addStack();
    lvlStack.layoutVertically();
    const lvlLbl = lvlStack.addText('POZIOM');
    lvlLbl.font = Font.boldSystemFont(9);
    lvlLbl.textColor = COLORS.dim;
    const lvl = lvlStack.addText(String(data.level));
    lvl.font = Font.boldSystemFont(18);
    lvl.textColor = COLORS.accent;

    statsRow.addSpacer();

    const xpStack = statsRow.addStack();
    xpStack.layoutVertically();
    const xpLbl = xpStack.addText('XP');
    xpLbl.font = Font.boldSystemFont(9);
    xpLbl.textColor = COLORS.dim;
    const xp = xpStack.addText(String(data.points));
    xp.font = Font.boldSystemFont(18);
    xp.textColor = COLORS.gold;

    // Stopka — data ostatniej akcji
    w.addSpacer(4);
    const footer = w.addText(data.lastActive || 'Brak danych');
    footer.font = Font.systemFont(9);
    footer.textColor = COLORS.dim;

    // Kliknięcie widgetu otwiera MBG (przez URL aplikacji)
    if (DATA_URL) w.url = DATA_URL.replace(/\/[^/]+$/, '/');

    return w;
}

function makeGradient() {
    const g = new LinearGradient();
    g.colors = [new Color('#1a2234'), new Color('#0a0e1a')];
    g.locations = [0, 1];
    return g;
}

// Demo data jeśli DATA_URL nie jest skonfigurowany
function demoData() {
    return {
        streak: 7,
        level: 3,
        points: 425,
        lastActive: 'Skonfiguruj DATA_URL'
    };
}

// === RUN ===
const widget = await createWidget();
if (config.runsInWidget) {
    Script.setWidget(widget);
} else {
    widget.presentSmall();
}
Script.complete();
