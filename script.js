/* =============================================================
   MOTYWACJA BEZ GRANIC — LOGIKA APLIKACJI
   Persystencja: localStorage (pełny eksport/import JSON)
   ============================================================= */

/* ====== STAN GLOBALNY ====== */
const STORAGE_KEY = 'mbg_state_v1';

const DEFAULT_STATE = {
    tasks: [],          // { id, title, description, startDate, endDate, status, points, completedAt, createdAt }
    activities: [],     // { id, taskId, taskTitle, start, end, duration }
    journal: [],        // { id, date, content, mood }
    challenges: [],     // { id, template, days, startDate, doneDates: [] }

    // Nawyki (inspiracja: Moje_Habit_Template.xlsx)
    habits: [],         // { id, name, icon, group: 'morning'|'day'|'night', type: 'daily'|'monthly', doneDates: [iso...] }
    habitsSeeded: false,

    // Hydration — 8 slotów dziennie z motywacyjnymi etykietami (jak w xlsx)
    hydration: {},      // { [isoDate]: [bool, bool, ..., bool] }  // 8 slotów

    gamification: {
        xp: 0,
        level: 1,
        points: 0,
        streak: 0,
        lastActiveDate: null,
        achievements: []
    },
    settings: {
        dailyGoal: 3,
        notifications: false,
        currentMood: null,
        calendarCursor: null       // ISO — aktualnie wyświetlany miesiąc w kalendarzu
    },
    timer: {
        running: false,
        startedAt: null,
        taskId: null,
        pomodoroTarget: null,        // sekundy — gdy ustawione, działa tryb pomodoro
        pomodoroCelebrated: false    // żeby fanfary zagrały tylko raz
    }
};

/* ====== DOMYŚLNE NAWYKI (z Moje_Habit_Template.xlsx) ====== */
const DEFAULT_HABITS = [
    { name: 'Prawidłowa postawa ciała',             icon: '🧍', group: 'day',     type: 'daily' },
    { name: 'Wypić 2 litry wody',                   icon: '💧', group: 'day',     type: 'daily' },
    { name: 'Suplementy / zdrowie',                 icon: '💊', group: 'morning', type: 'daily' },
    { name: 'Zdrowe śniadanie',                     icon: '🥣', group: 'morning', type: 'daily' },
    { name: 'Sprzątanie / porządek',                icon: '🧹', group: 'day',     type: 'daily' },
    { name: 'Umyć zęby rano',                       icon: '🪥', group: 'morning', type: 'daily' },
    { name: 'Umyć zęby wieczorem',                  icon: '🌙', group: 'night',   type: 'daily' },
    { name: 'Zapłacić rachunki',                    icon: '💳', group: 'day',     type: 'monthly' },
    { name: 'Generalne sprzątanie',                 icon: '🧽', group: 'day',     type: 'monthly' },
    { name: 'Ustawić budżet miesięczny',            icon: '💰', group: 'day',     type: 'monthly' }
];

/* ====== HYDRATION SLOTS (inspiracja: xlsx — Stay Hydrated 250ml x 8) ====== */
const HYDRATION_SLOTS = [
    { time: '07:00', emoji: '☀️',  label: 'Good Morning'      },
    { time: '09:00', emoji: '💧', label: 'Hydrate Yourself'  },
    { time: '11:00', emoji: '🎯', label: 'Pamiętaj o celu'   },
    { time: '13:00', emoji: '🔥', label: 'Keep Chugging'     },
    { time: '15:00', emoji: '💪', label: 'Feeling Awesome'   },
    { time: '17:00', emoji: '🚀', label: "Don't Give Up"     },
    { time: '19:00', emoji: '⭐', label: 'Almost Finished'   },
    { time: '21:00', emoji: '🏆', label: 'YOU DID IT!'       }
];

// Wczytaj dane lub utwórz domyślne
let state = loadState();

/* ====== PERSYSTENCJA ====== */
function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return structuredClone(DEFAULT_STATE);
        const parsed = JSON.parse(raw);
        // Scalenie z defaultami — na wypadek brakujących pól po aktualizacji
        return deepMerge(structuredClone(DEFAULT_STATE), parsed);
    } catch (e) {
        console.warn('Błąd wczytywania stanu, tworzę nowy.', e);
        return structuredClone(DEFAULT_STATE);
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function deepMerge(target, src) {
    for (const k in src) {
        if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
            target[k] = deepMerge(target[k] || {}, src[k]);
        } else {
            target[k] = src[k];
        }
    }
    return target;
}

/* ====== POMOCNICZE ====== */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().slice(0, 10);
const formatTime = (s) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
};
const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatDateTime = (iso) => new Date(iso).toLocaleString('pl-PL', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
});

/* ====== CYTATY MOTYWACYJNE ====== */
const QUOTES = [
    "Dyscyplina jest mostem między celami a osiągnięciami. — Jim Rohn",
    "Małe kroki każdego dnia prowadzą do wielkich zmian.",
    "Nie czekaj na motywację — zbuduj nawyk.",
    "Jesteś o 1% lepszy niż wczoraj. To wystarczy.",
    "Zrób dziś to, czego inni nie chcą, byś jutro żył tak, jak inni nie mogą.",
    "Sukces to suma małych wysiłków powtarzanych dzień po dniu.",
    "Nie porównuj się do innych. Porównuj się do siebie wczorajszego.",
    "Deep work > rozproszone godziny.",
    "Ograniczenia są źródłem kreatywności.",
    "Każda minuta skupienia to inwestycja, której nikt Ci nie zabierze.",
    "Twoja przyszłość buduje się w decyzjach z tego tygodnia.",
    "Nawyk jest mocniejszy niż chwilowa siła woli.",
    "Zaczynaj mały. Bądź konsekwentny. Zobacz, co się stanie.",
    "Skupienie to najrzadsza waluta XXI wieku — pilnuj swojej.",
    "Idź, kiedy inni stoją. Stań na podium, kiedy inni odpadają."
];

function getDailyQuote() {
    const dayIdx = new Date().getDate() % QUOTES.length;
    return QUOTES[dayIdx];
}

/* ====== SYSTEM OSIĄGNIĘĆ ====== */
const ACHIEVEMENTS = [
    { id: 'first_task',  name: 'Pierwszy krok',     desc: 'Ukończ pierwsze zadanie',      icon: '🌱', check: s => s.tasks.filter(t => t.status === 'done').length >= 1 },
    { id: 'ten_tasks',   name: 'Wojownik',           desc: 'Ukończ 10 zadań',              icon: '⚔️', check: s => s.tasks.filter(t => t.status === 'done').length >= 10 },
    { id: 'fifty_tasks', name: 'Maszyna',            desc: 'Ukończ 50 zadań',              icon: '🤖', check: s => s.tasks.filter(t => t.status === 'done').length >= 50 },
    { id: 'hundred',     name: 'Legenda',            desc: 'Ukończ 100 zadań',             icon: '👑', check: s => s.tasks.filter(t => t.status === 'done').length >= 100 },
    { id: 'streak_3',    name: 'Rozpęd',             desc: '3 dni z rzędu',                 icon: '🚀', check: s => s.gamification.streak >= 3 },
    { id: 'streak_7',    name: 'Tydzień ognia',      desc: '7 dni z rzędu',                 icon: '🔥', check: s => s.gamification.streak >= 7 },
    { id: 'streak_30',   name: 'Nie do powstrzymania', desc: '30 dni z rzędu',              icon: '⚡', check: s => s.gamification.streak >= 30 },
    { id: 'streak_100',  name: 'Święty Graal',       desc: '100 dni z rzędu',               icon: '🏆', check: s => s.gamification.streak >= 100 },
    { id: 'deep_work',   name: 'Deep Work',          desc: 'Jedna sesja minimum 60 minut',  icon: '🧠', check: s => s.activities.some(a => a.duration >= 3600) },
    { id: 'marathon',    name: 'Maraton',            desc: 'Jedna sesja minimum 4h',        icon: '🏃', check: s => s.activities.some(a => a.duration >= 14400) },
    { id: 'level_5',     name: 'Poziom 5',           desc: 'Osiągnij poziom 5',             icon: '⭐', check: s => s.gamification.level >= 5 },
    { id: 'level_10',    name: 'Poziom 10',          desc: 'Osiągnij poziom 10',            icon: '🌟', check: s => s.gamification.level >= 10 },
    { id: 'level_25',    name: 'Mistrz',             desc: 'Osiągnij poziom 25',            icon: '💫', check: s => s.gamification.level >= 25 },
    { id: 'journalist',  name: 'Kronikarz',          desc: '10 wpisów w dzienniku',         icon: '📓', check: s => s.journal.length >= 10 },
    { id: 'early_bird',  name: 'Ranny ptaszek',      desc: 'Sesja przed 7:00',              icon: '🌅', check: s => s.activities.some(a => new Date(a.start).getHours() < 7) },
    { id: 'night_owl',   name: 'Nocna sowa',         desc: 'Sesja po 23:00',                icon: '🦉', check: s => s.activities.some(a => new Date(a.start).getHours() >= 23) }
];

/* ====== SYSTEM XP / POZIOMÓW ====== */
// Wymagane XP rośnie kwadratowo — im wyższy poziom, tym trudniej
function xpForLevel(lvl) { return 100 * lvl * lvl; }
function levelFromXP(xp) {
    let lvl = 1;
    while (xp >= xpForLevel(lvl)) lvl++;
    return lvl;
}
function xpProgress() {
    const lvl = state.gamification.level;
    const prev = lvl === 1 ? 0 : xpForLevel(lvl - 1);
    const next = xpForLevel(lvl);
    const have = state.gamification.xp - prev;
    const need = next - prev;
    return { have, need, percent: Math.min(100, (have / need) * 100) };
}

function addXP(amount) {
    state.gamification.xp += amount;
    state.gamification.points += amount;
    const oldLvl = state.gamification.level;
    const newLvl = levelFromXP(state.gamification.xp);
    if (newLvl > oldLvl) {
        state.gamification.level = newLvl;
        showLevelUp(newLvl);
    }
    checkAchievements();
    saveState();
    renderHeader();
}

/* ====== STREAK (CIĄGŁOŚĆ DNI) ====== */
function updateStreak() {
    const t = today();
    const last = state.gamification.lastActiveDate;
    if (last === t) return; // już zaktualizowane dziś
    if (!last) {
        state.gamification.streak = 1;
    } else {
        const diffDays = Math.floor((new Date(t) - new Date(last)) / 86400000);
        if (diffDays === 1)      state.gamification.streak += 1;
        else if (diffDays > 1)   state.gamification.streak = 1;  // utrata streaka
    }
    state.gamification.lastActiveDate = t;
    saveState();
}

/* ====== OSIĄGNIĘCIA — SPRAWDZANIE ====== */
function checkAchievements() {
    ACHIEVEMENTS.forEach(a => {
        if (!state.gamification.achievements.includes(a.id) && a.check(state)) {
            state.gamification.achievements.push(a.id);
            toast(`🏆 Nowe osiągnięcie: ${a.name}`, a.desc, 'success');
            addXP(50); // bonus za osiągnięcie
        }
    });
}

/* ====== TOAST / POWIADOMIENIA ====== */
function toast(title, msg = '', type = '') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<div class="toast-title">${title}</div><div class="toast-msg">${msg}</div>`;
    $('#toastContainer').appendChild(el);
    setTimeout(() => el.remove(), 3500);

    // Opcjonalnie natywne powiadomienie
    if (state.settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: msg });
    }
}

/* ====== ANIMACJA LEVEL-UP ====== */
function showLevelUp(lvl) {
    $('#levelUpNum').textContent = lvl;
    $('#levelUpScreen').classList.remove('hidden');
    setTimeout(() => $('#levelUpScreen').classList.add('hidden'), 2800);
}

/* =============================================================
   NAWIGACJA
   ============================================================= */
function switchView(viewName) {
    // Auto-stop odczytu dziennika gdy wychodzimy z zakładki Dziennik
    if (viewName !== 'journal' && journalSpeakingActive) {
        stopJournalSpeak();
    }

    $$('.view').forEach(v => v.classList.remove('active'));
    $(`#view-${viewName}`).classList.add('active');
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === viewName));

    // Odśwież widok po przejściu
    if (viewName === 'tasks') renderTasks();
    if (viewName === 'timer') renderActivities();
    if (viewName === 'journal') renderJournal();
    if (viewName === 'stats') renderStats();
    if (viewName === 'achievements') renderAchievements();
    if (viewName === 'challenges') renderChallenges();
    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'habits') renderHabits();
    if (viewName === 'calendar') renderCalendar();
}

$$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchView(btn.dataset.view);
        closeSidebar(); // po wyborze zakładki zamknij menu
    });
});

/* ====== MENU HAMBURGER (drawer) ====== */
const sidebarEl = $('.sidebar');
const overlayEl = $('#sidebarOverlay');
const hamburgerEl = $('#hamburger');

function openSidebar() {
    sidebarEl.classList.add('open');
    overlayEl.classList.add('active');
    hamburgerEl.classList.add('active');
    hamburgerEl.textContent = '✕';
}

function closeSidebar() {
    sidebarEl.classList.remove('open');
    overlayEl.classList.remove('active');
    hamburgerEl.classList.remove('active');
    hamburgerEl.textContent = '☰';
}

hamburgerEl?.addEventListener('click', () => {
    sidebarEl.classList.contains('open') ? closeSidebar() : openSidebar();
});

overlayEl?.addEventListener('click', closeSidebar);

// ESC zamyka menu
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebarEl.classList.contains('open')) closeSidebar();
});

/* =============================================================
   ZADANIA — CRUD
   ============================================================= */
const taskModal = $('#taskModal');

function openTaskModal() {
    $('#taskTitle').value = '';
    $('#taskDesc').value = '';
    $('#taskStart').value = today();
    $('#taskEnd').value = '';
    $('#taskPoints').value = '25';
    taskModal.classList.remove('hidden');
    setTimeout(() => $('#taskTitle').focus(), 100);
}

$('#openAddTask').addEventListener('click', openTaskModal);
$('#quickAddTask').addEventListener('click', openTaskModal);
$('#cancelTask').addEventListener('click', () => taskModal.classList.add('hidden'));

$('#saveTask').addEventListener('click', () => {
    const title = $('#taskTitle').value.trim();
    if (!title) { toast('Podaj tytuł zadania', '', 'warning'); return; }

    const task = {
        id: uid(),
        title,
        description: $('#taskDesc').value.trim(),
        startDate: $('#taskStart').value || today(),
        endDate: $('#taskEnd').value || null,
        status: 'active',
        points: Number($('#taskPoints').value),
        completedAt: null,
        createdAt: new Date().toISOString()
    };

    state.tasks.unshift(task);
    saveState();
    taskModal.classList.add('hidden');
    toast('Zadanie dodane', title, 'success');
    renderTasks();
    renderDashboard();
    renderTimerTaskSelect();
});

// Toggle ukończenia zadania — pojedynczy klik = działanie (minimalny opór)
function toggleTask(id) {
    const t = state.tasks.find(t => t.id === id);
    if (!t) return;

    if (t.status === 'done') {
        t.status = 'active';
        t.completedAt = null;
        state.gamification.xp = Math.max(0, state.gamification.xp - t.points);
        state.gamification.points = Math.max(0, state.gamification.points - t.points);
        state.gamification.level = levelFromXP(state.gamification.xp);
    } else {
        t.status = 'done';
        t.completedAt = new Date().toISOString();
        updateStreak();
        addXP(t.points);
        toast(`✅ +${t.points} XP`, t.title, 'success');
    }
    saveState();
    renderTasks();
    renderDashboard();
    renderHeader();
}

function deleteTask(id) {
    if (!confirm('Usunąć to zadanie?')) return;
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveState();
    renderTasks();
    renderDashboard();
    renderTimerTaskSelect();
}

let currentFilter = 'all';
$$('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

function renderTasks() {
    const list = $('#taskList');
    let tasks = [...state.tasks];
    const t = today();

    if (currentFilter === 'active')   tasks = tasks.filter(x => x.status === 'active');
    if (currentFilter === 'done')     tasks = tasks.filter(x => x.status === 'done');
    if (currentFilter === 'overdue')  tasks = tasks.filter(x => x.status === 'active' && x.endDate && x.endDate < t);

    if (tasks.length === 0) {
        list.innerHTML = `<div class="empty-state">Brak zadań w tej kategorii. Dodaj nowe i zacznij działać!</div>`;
        return;
    }

    list.innerHTML = tasks.map(task => {
        const overdue = task.status === 'active' && task.endDate && task.endDate < t;
        return `
            <div class="task-item ${task.status === 'done' ? 'done' : ''} ${overdue ? 'overdue' : ''}">
                <div class="task-check ${task.status === 'done' ? 'checked' : ''}" onclick="toggleTask('${task.id}')">
                    ${task.status === 'done' ? '✓' : ''}
                </div>
                <div class="task-info">
                    <div class="task-title">${escapeHTML(task.title)}</div>
                    <div class="task-meta">
                        ${task.description ? `<span>${escapeHTML(task.description)}</span>` : ''}
                        ${task.endDate ? `<span>📅 ${formatDate(task.endDate)}</span>` : ''}
                        ${task.endDate && task.status !== 'done' ? `<span class="planned-countdown ${countdownClass(task.endDate, task.status)}">${daysUntilLabel(task.endDate)}</span>` : ''}
                        <span class="task-xp">💎 ${task.points} XP</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="icon-btn delete" onclick="deleteTask('${task.id}')">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function escapeHTML(str) {
    return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* =============================================================
   TIMER SESJI
   ============================================================= */
let timerInterval = null;

function renderTimerTaskSelect() {
    const sel = $('#timerTaskSelect');
    const active = state.tasks.filter(t => t.status === 'active');
    sel.innerHTML = '<option value="">— wybierz zadanie lub zostaw puste —</option>' +
        active.map(t => `<option value="${t.id}">${escapeHTML(t.title)}</option>`).join('');
}

function startTimer(taskId = null) {
    if (state.timer.running) return;
    state.timer.running = true;
    state.timer.startedAt = Date.now();
    state.timer.taskId = taskId || $('#timerTaskSelect').value || null;
    saveState();

    $('#timerStart').classList.add('hidden');
    $('#timerStop').classList.remove('hidden');
    $('#timerHint').textContent = 'Trwa sesja. Skup się. Nie zatrzymuj się.';

    timerInterval = setInterval(tickTimer, 200);
    toast('▶️ Sesja startuje', 'Skupienie włączone', 'success');
}

function stopTimer() {
    if (!state.timer.running) return;

    const start = state.timer.startedAt;
    const end = Date.now();
    const duration = Math.floor((end - start) / 1000);

    const taskId = state.timer.taskId;
    const task = taskId ? state.tasks.find(t => t.id === taskId) : null;

    state.activities.unshift({
        id: uid(),
        taskId,
        taskTitle: task ? task.title : 'Sesja ogólna',
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        duration
    });

    state.timer.running = false;
    state.timer.startedAt = null;
    state.timer.taskId = null;
    state.timer.pomodoroTarget = null;
    state.timer.pomodoroCelebrated = false;

    clearInterval(timerInterval);
    $('#timerDisplay').textContent = '00:00:00';
    $('#focusTimer').textContent = '00:00:00';
    $('#timerStart').classList.remove('hidden');
    $('#timerStop').classList.add('hidden');
    $('#timerHint').textContent = 'Kliknij START, aby rozpocząć sesję.';

    // Nagroda za czas: 1 XP / minuta
    const xp = Math.floor(duration / 60);
    if (xp > 0) {
        updateStreak();
        addXP(xp);
        toast(`⏹️ Sesja ${formatTime(duration)}`, `+${xp} XP za skupienie!`, 'success');
    }

    saveState();
    renderActivities();
    renderDashboard();
    checkAchievements();
}

function tickTimer() {
    if (!state.timer.running) return;
    const elapsed = Math.floor((Date.now() - state.timer.startedAt) / 1000);
    const formatted = formatTime(elapsed);
    $('#timerDisplay').textContent = formatted;
    $('#focusTimer').textContent = formatted;

    const task = state.timer.taskId ? state.tasks.find(t => t.id === state.timer.taskId) : null;
    $('#focusTaskName').textContent = task ? task.title : 'Głęboka praca';

    // Tryb pomodoro — odliczanie do zera + celebracja
    if (state.timer.pomodoroTarget) {
        const target = state.timer.pomodoroTarget;
        const remaining = Math.max(0, target - elapsed);
        const mm = Math.floor(remaining / 60);
        const ss = remaining % 60;
        const display = `${mm}:${String(ss).padStart(2, '0')}`;

        const cd = $('#pomodoroCountdown');
        if (cd) {
            cd.textContent = display;
            cd.classList.toggle('done', remaining === 0);
        }
        const bar = $('#pomodoroBar');
        if (bar) bar.style.width = Math.min(100, (elapsed / target) * 100) + '%';

        const pill = $('#pomodoroPillTime');
        if (pill) pill.textContent = display;

        // Celebracja po osiągnięciu celu (tylko raz)
        if (remaining === 0 && !state.timer.pomodoroCelebrated) {
            state.timer.pomodoroCelebrated = true;
            saveState();
            celebratePomodoro(Math.floor(target / 60));
        }
    }
}

/* === CHIME — trzytonowa gama (Web Audio API) === */
let pomAudioCtx = null;
function playChime() {
    try {
        if (!pomAudioCtx) pomAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = pomAudioCtx;
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 — radosny akord
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            const t0 = ctx.currentTime + i * 0.18;
            osc.frequency.setValueAtTime(freq, t0);
            gain.gain.setValueAtTime(0.001, t0);
            gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
            osc.start(t0);
            osc.stop(t0 + 0.55);
        });
    } catch (e) {}
}

function celebratePomodoro(minutes) {
    playChime();
    const card = $('#pomodoroCard');
    if (card) {
        card.classList.add('celebrate');
        setTimeout(() => card.classList.remove('celebrate'), 1700);
    }
    toast(`🎉 Brawo! ${minutes} min za Tobą`, 'Mózg jest rozgrzany — kontynuuj albo zatrzymaj. Twój wybór.', 'success');
    // Bonusowe XP za ukończony pomodoro
    addXP(minutes);
    if (state.settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('🍅 Pomodoro zakończone', {
            body: `Brawo! ${minutes} minut zrobione. +${minutes} XP bonusu.`,
            icon: './icon.svg'
        });
    }
}

/* === START / STOP POMODORO === */
function startPomodoro(mins) {
    state.timer.pomodoroTarget = mins * 60;
    state.timer.pomodoroCelebrated = false;
    if (!state.timer.running) {
        startTimer(); // używa istniejącego startTimer
    }
    saveState();
    renderPomodoroUI();
    toast(`🍅 Działasz! ${mins} min`, 'Bez wymówek. Zacząłeś — to już jest sukces.', 'success');
}

function stopPomodoro() {
    state.timer.pomodoroTarget = null;
    state.timer.pomodoroCelebrated = false;
    saveState();
    if (state.timer.running) stopTimer();
    renderPomodoroUI();
}

/* === RENDER POMODORO UI === */
function renderPomodoroUI() {
    const active = $('#pomodoroActive');
    const buttons = $('#pomodoroButtons');
    const pill = $('#pomodoroPill');
    const isPom = !!(state.timer.running && state.timer.pomodoroTarget);

    if (active && buttons) {
        active.classList.toggle('hidden', !isPom);
        buttons.classList.toggle('hidden', isPom);
    }
    if (pill) pill.classList.toggle('hidden', !isPom);

    if (isPom) {
        const mins = Math.floor(state.timer.pomodoroTarget / 60);
        const lbl = $('#pomodoroTargetLbl');
        if (lbl) lbl.textContent = `${mins} min`;
        // Wymuś jedną aktualizację countdown od razu
        tickTimer();
    }
}

$('#timerStart').addEventListener('click', () => startTimer());
$('#timerStop').addEventListener('click', stopTimer);
$('#quickStartTimer')?.addEventListener('click', () => {
    switchView('timer');
    startTimer();
});

/* === POMODORO — handlery przycisków === */
document.querySelectorAll('.pomodoro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const mins = parseInt(btn.dataset.pom, 10);
        if (mins > 0) startPomodoro(mins);
    });
});

$('#pomodoroStop')?.addEventListener('click', () => {
    if (confirm('Zakończyć sesję? Czas zostanie zapisany.')) {
        stopPomodoro();
    }
});

// Klik w pigułkę topbar = przeskocz do dashboardu (gdzie jest duże odliczanie)
$('#pomodoroPill')?.addEventListener('click', () => switchView('dashboard'));

function renderActivities() {
    renderTimerDaySummary();

    const list = $('#activitiesList');
    if (state.activities.length === 0) {
        list.innerHTML = '<div class="empty-state">Jeszcze żadnej sesji. Kliknij START powyżej.</div>';
        return;
    }
    list.innerHTML = state.activities.slice(0, 20).map(a => `
        <div class="activity-item">
            <div class="activity-info">
                ${escapeHTML(a.taskTitle)}
                <small>${formatDateTime(a.start)}</small>
            </div>
            <div class="activity-duration">${formatTime(a.duration)}</div>
        </div>
    `).join('');
}

/* === ZBIORCZY CZAS DZISIEJSZY (nad historią sesji) === */
function formatHumanTime(seconds) {
    if (!seconds || seconds === 0) return '0 min';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m} min`;
}

function renderTimerDaySummary() {
    const t = today();
    const todayActs = state.activities.filter(a => a.start.slice(0, 10) === t);
    const totalSec = todayActs.reduce((s, a) => s + a.duration, 0);
    const count = todayActs.length;
    const avg = count > 0 ? Math.floor(totalSec / count) : 0;
    const longest = count > 0 ? Math.max(...todayActs.map(a => a.duration)) : 0;

    const elTotal = $('#todayTotalTime');
    const elCount = $('#todaySessionCount');
    const elAvg = $('#todayAvgSession');
    const elLong = $('#todayLongestSession');

    if (elTotal) elTotal.textContent = formatHumanTime(totalSec);
    if (elCount) elCount.textContent = count;
    if (elAvg)   elAvg.textContent = count > 0 ? formatHumanTime(avg) : '—';
    if (elLong)  elLong.textContent = count > 0 ? formatHumanTime(longest) : '—';
}

/* === BANNER POMOCY (zwijany na stałe) === */
(function initHabitsHelpBanner() {
    const banner = $('#habitsHelpBanner');
    const closeBtn = $('#dismissHabitsHelp');
    if (!banner || !closeBtn) return;
    if (localStorage.getItem('mbg_habits_help_dismissed') === '1') {
        banner.classList.add('dismissed');
    }
    closeBtn.addEventListener('click', () => {
        banner.classList.add('dismissed');
        localStorage.setItem('mbg_habits_help_dismissed', '1');
    });
})();

/* =============================================================
   DZIENNIK
   ============================================================= */
/* === DZIENNIK — DOSTĘPNE JĘZYKI === */
const JOURNAL_LANGS = [
    { code: 'en', label: 'English',    flag: '🇬🇧', bcp: 'en-GB' },
    { code: 'de', label: 'Deutsch',    flag: '🇩🇪', bcp: 'de-DE' },
    { code: 'fr', label: 'Français',   flag: '🇫🇷', bcp: 'fr-FR' },
    { code: 'ru', label: 'Русский',    flag: '🇷🇺', bcp: 'ru-RU' },
    { code: 'es', label: 'Español',    flag: '🇪🇸', bcp: 'es-ES' }
];

// Wybiera najlepszy dostępny głos — dla en-GB SILNIE preferuje brytyjskie głosy
function pickBestJournalVoice(bcpCode) {
    if (!('speechSynthesis' in window)) return null;
    const voices = speechSynthesis.getVoices();
    const target = bcpCode.toLowerCase();

    // ===== SPECJALNY PRZYPADEK: British English =====
    if (target === 'en-gb') {
        const british = voices.filter(v => v.lang.toLowerCase() === 'en-gb');
        const priorities = [
            // Google UK voices (Android, Chrome desktop)
            v => /google.*(uk|british)/i.test(v.name),
            // Microsoft British natural voices (Windows)
            v => /microsoft.*(libby|sonia|ryan|hazel|george|abbi|alfie|bella|maisie|noah|olivia|thomas)/i.test(v.name),
            // Apple British voices (iOS, macOS)
            v => /^(daniel|kate|serena|oliver|martha|arthur|stephanie)/i.test(v.name),
            // Cokolwiek z en-GB
            v => true
        ];
        for (const p of priorities) {
            const found = british.find(p);
            if (found) return found;
        }
        // Fallback: spróbuj inne en-* ale tylko jeśli BRAK en-GB
        if (british.length === 0) {
            const anyEn = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
            return anyEn[0] || null;
        }
        return british[0];
    }

    // ===== POZOSTAŁE JĘZYKI =====
    const prefix = target.split('-')[0];
    const candidates = voices.filter(v => v.lang.toLowerCase().startsWith(prefix));
    if (!candidates.length) return null;
    const priorities = [
        v => /google/i.test(v.name),
        v => /natural|neural|online|wavenet/i.test(v.name),
        v => v.lang.toLowerCase() === target,
        v => true
    ];
    for (const p of priorities) {
        const found = candidates.find(p);
        if (found) return found;
    }
    return candidates[0];
}

/* === GLOBALNY STAN ODCZYTU DZIENNIKA === */
let journalSpeakingActive = false;
let journalCurrentBadge = null;
let journalCurrentUtterance = null;

// Wystaw stan globalnie, by clock.js mógł sprawdzić
window.mbgTTSBusy = false;

function emitTTSState(busy) {
    window.mbgTTSBusy = busy;
    window.dispatchEvent(new CustomEvent('mbg-tts-state', { detail: { busy } }));
}

// Pokaż floating bar
function showSpeechBar(lang, text) {
    const bar = $('#speechBar');
    const langLbl = $('#speechBarLang');
    const preview = $('#speechBarPreview');
    if (!bar) return;
    const l = JOURNAL_LANGS.find(x => x.code === lang);
    const langName = lang === 'pl' ? '🇵🇱 Polski' : (l ? `${l.flag} ${l.label}` : 'Czytam');
    langLbl.textContent = `Odtwarzam: ${langName}`;
    preview.textContent = text.slice(0, 60).replace(/\n/g, ' ') + (text.length > 60 ? '…' : '');
    bar.classList.remove('hidden');
}

function hideSpeechBar() {
    const bar = $('#speechBar');
    if (bar) bar.classList.add('hidden');
}

// Pokaż tłumaczenie w widoku wpisu (inline)
function showTranslationView(entryId, lang, text) {
    // Ukryj poprzednie
    document.querySelectorAll('.entry-translation-view').forEach(v => v.classList.add('hidden'));
    if (!entryId || lang === 'pl') return;
    const view = document.querySelector(`.entry-translation-view[data-entry="${entryId}"]`);
    if (!view) return;
    const l = JOURNAL_LANGS.find(x => x.code === lang);
    if (!l) return;
    view.innerHTML = `
        <div class="translation-header">
            <span class="translation-flag">${l.flag}</span>
            <span>${l.label}</span>
        </div>
        <div class="translation-text">${escapeHTML(text).replace(/\n/g, '<br>')}</div>
    `;
    view.classList.remove('hidden');
}

// Zatrzymaj odczyt (uniwersalna funkcja)
function stopJournalSpeak() {
    try { speechSynthesis.cancel(); } catch (e) {}
    document.querySelectorAll('.lang-badge.speaking, .icon-btn.speaking').forEach(b => b.classList.remove('speaking'));
    journalSpeakingActive = false;
    journalCurrentBadge = null;
    journalCurrentUtterance = null;
    hideSpeechBar();
    emitTTSState(false);
}

// Główna funkcja czytania
function speakJournalText(text, bcpCode, badgeEl = null, entryId = null, lang = null) {
    if (!('speechSynthesis' in window)) {
        toast('Brak TTS', 'Twoja przeglądarka nie obsługuje syntezy mowy', 'warning');
        return;
    }

    // Klik w ten sam przycisk = zatrzymaj
    if (journalCurrentBadge === badgeEl && journalSpeakingActive) {
        stopJournalSpeak();
        return;
    }

    // Zatrzymaj poprzednie (różny badge lub nic nie gra)
    try { speechSynthesis.cancel(); } catch (e) {}
    document.querySelectorAll('.lang-badge.speaking, .icon-btn.speaking').forEach(b => b.classList.remove('speaking'));

    // Pokaż tłumaczenie w wpisie (jeśli nie polski)
    showTranslationView(entryId, lang, text);

    const u = new SpeechSynthesisUtterance(text);
    u.lang = bcpCode;
    const v = pickBestJournalVoice(bcpCode);
    if (v) u.voice = v;
    u.rate = 0.95;
    u.pitch = 1.0;
    u.volume = 1.0;

    // Stan
    journalSpeakingActive = true;
    journalCurrentBadge = badgeEl;
    journalCurrentUtterance = u;
    if (badgeEl) badgeEl.classList.add('speaking');
    showSpeechBar(lang || 'pl', text);
    emitTTSState(true);

    const endHandler = () => {
        if (badgeEl) badgeEl.classList.remove('speaking');
        if (journalCurrentBadge === badgeEl) {
            journalSpeakingActive = false;
            journalCurrentBadge = null;
            journalCurrentUtterance = null;
            hideSpeechBar();
            emitTTSState(false);
        }
    };
    u.onend = endHandler;
    u.onerror = endHandler;

    speechSynthesis.speak(u);

    // Bezpiecznik: Chrome czasem zatrzymuje TTS przy dłuższym tekście — keepalive trick
    keepSpeechAlive();
}

// Workaround: Chrome zatrzymuje speechSynthesis po ~15 sek bez tego
let speechKeepAliveTimer = null;
function keepSpeechAlive() {
    clearInterval(speechKeepAliveTimer);
    speechKeepAliveTimer = setInterval(() => {
        if (speechSynthesis.speaking && !speechSynthesis.paused) {
            speechSynthesis.pause();
            speechSynthesis.resume();
        } else {
            clearInterval(speechKeepAliveTimer);
        }
    }, 12000);
}

/* === MOOD PICKER (z obsługą edycji) === */
$$('.mood-btn').forEach(b => {
    b.addEventListener('click', () => {
        $$('.mood-btn').forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
        state.settings.currentMood = Number(b.dataset.mood);
    });
});

/* === PANEL JĘZYKÓW: cog + multilang checkbox === */
function buildJournalLangFields() {
    const list = $('#journalLangList');
    list.innerHTML = JOURNAL_LANGS.map(l => `
        <div class="lang-row">
            <label class="lang-row-header">
                <input type="checkbox" class="lang-toggle" data-lang="${l.code}">
                <span class="lang-flag">${l.flag}</span>
                <span>${l.label}</span>
            </label>
            <textarea class="lang-text hidden" data-lang="${l.code}"
                      placeholder="${l.label} — tekst tutaj…" rows="3"></textarea>
        </div>
    `).join('');

    // Toggle textarea per language
    list.querySelectorAll('.lang-toggle').forEach(cb => {
        cb.addEventListener('change', () => {
            const ta = list.querySelector(`.lang-text[data-lang="${cb.dataset.lang}"]`);
            if (ta) ta.classList.toggle('hidden', !cb.checked);
        });
    });
}

$('#journalLangCog').addEventListener('click', () => {
    const panel = $('#journalLangPanel');
    const cog = $('#journalLangCog');
    const isOpen = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    cog.classList.toggle('active', !isOpen);
});

$('#journalMultilingual').addEventListener('change', (e) => {
    $('#journalLangList').classList.toggle('hidden', !e.target.checked);
});

/* === EDYCJA / RESET === */
let editingJournalId = null;

function startEditingJournal(id) {
    const entry = state.journal.find(e => e.id === id);
    if (!entry) return;
    editingJournalId = id;

    $('#journalInput').value = entry.content;
    state.settings.currentMood = entry.mood || null;
    $$('.mood-btn').forEach(b => {
        b.classList.toggle('selected', entry.mood && Number(b.dataset.mood) === entry.mood);
    });

    // Wczytaj tłumaczenia (jeśli są)
    const hasTrans = entry.translations && Object.keys(entry.translations).length > 0;
    $('#journalMultilingual').checked = hasTrans;
    $('#journalLangList').classList.toggle('hidden', !hasTrans);
    if (hasTrans) {
        $('#journalLangPanel').classList.remove('hidden');
        $('#journalLangCog').classList.add('active');
    }
    document.querySelectorAll('#journalLangList .lang-toggle').forEach(cb => {
        const text = entry.translations?.[cb.dataset.lang];
        cb.checked = !!text;
        const ta = $(`#journalLangList .lang-text[data-lang="${cb.dataset.lang}"]`);
        if (ta) {
            ta.value = text || '';
            ta.classList.toggle('hidden', !text);
        }
    });

    // UI mode
    $('#journalFormTitle').textContent = '✏️ Edytuj wpis — ' + formatDate(entry.date.slice(0, 10));
    $('#saveJournal').innerHTML = '💾 Zaktualizuj wpis';
    $('#cancelEditJournal').classList.remove('hidden');

    // Wizualnie zaznacz edytowany wpis
    document.querySelectorAll('.journal-entry').forEach(el => el.classList.remove('editing'));
    document.querySelector(`.journal-entry[data-id="${id}"]`)?.classList.add('editing');

    // Scroll do formularza
    document.querySelector('#view-journal .journal-form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetJournalForm() {
    editingJournalId = null;
    $('#journalInput').value = '';
    $$('.mood-btn').forEach(b => b.classList.remove('selected'));
    state.settings.currentMood = null;
    $('#journalFormTitle').innerHTML = 'Nowy wpis — <span id="journalDateLabel"></span>';
    $('#journalDateLabel').textContent = new Date().toLocaleDateString('pl-PL', {
        weekday: 'long', day: 'numeric', month: 'long'
    });
    $('#saveJournal').innerHTML = '💾 Zapisz wpis (+10 XP)';
    $('#cancelEditJournal').classList.add('hidden');

    // Reset tłumaczeń
    $('#journalMultilingual').checked = false;
    $('#journalLangList').classList.add('hidden');
    document.querySelectorAll('#journalLangList .lang-toggle').forEach(cb => cb.checked = false);
    document.querySelectorAll('#journalLangList .lang-text').forEach(ta => {
        ta.value = '';
        ta.classList.add('hidden');
    });
    document.querySelectorAll('.journal-entry').forEach(el => el.classList.remove('editing'));
}

$('#cancelEditJournal').addEventListener('click', resetJournalForm);

/* === ZAPIS / AKTUALIZACJA WPISU === */
$('#saveJournal').addEventListener('click', () => {
    const content = $('#journalInput').value.trim();
    if (!content) { toast('Napisz coś', '', 'warning'); return; }

    // Zbierz tłumaczenia
    const translations = {};
    if ($('#journalMultilingual').checked) {
        JOURNAL_LANGS.forEach(l => {
            const cb = document.querySelector(`#journalLangList .lang-toggle[data-lang="${l.code}"]`);
            const ta = document.querySelector(`#journalLangList .lang-text[data-lang="${l.code}"]`);
            if (cb?.checked && ta?.value.trim()) translations[l.code] = ta.value.trim();
        });
    }
    const hasTrans = Object.keys(translations).length > 0;

    if (editingJournalId) {
        // Aktualizacja istniejącego
        const entry = state.journal.find(e => e.id === editingJournalId);
        if (entry) {
            entry.content = content;
            entry.mood = state.settings.currentMood;
            if (hasTrans) entry.translations = translations;
            else delete entry.translations;
            entry.editedAt = new Date().toISOString();
        }
        saveState();
        toast('✅ Wpis zaktualizowany', '', 'success');
    } else {
        // Nowy wpis
        const newEntry = {
            id: uid(),
            date: new Date().toISOString(),
            content,
            mood: state.settings.currentMood
        };
        if (hasTrans) newEntry.translations = translations;
        state.journal.unshift(newEntry);
        saveState();
        updateStreak();
        addXP(10);
        toast('📓 Wpis zapisany', '+10 XP za refleksję', 'success');
        updateChallengeProgress('journal');
    }

    resetJournalForm();
    renderJournal();
    renderDashboard();
});

$('#quickJournal').addEventListener('click', () => switchView('journal'));

/* === RENDER LISTY === */
function renderJournal() {
    $('#journalDateLabel').textContent = new Date().toLocaleDateString('pl-PL', {
        weekday: 'long', day: 'numeric', month: 'long'
    });
    const list = $('#journalList');
    if (state.journal.length === 0) {
        list.innerHTML = '<div class="empty-state">Brak wpisów. Zacznij dziś — pierwszy wpis to pierwszy krok.</div>';
        updateBulkCounter();
        return;
    }
    const moods = { 1:'😫', 2:'😕', 3:'😐', 4:'🙂', 5:'🔥' };

    list.innerHTML = state.journal.map(e => {
        const transBadges = e.translations ? Object.keys(e.translations).map(code => {
            const l = JOURNAL_LANGS.find(x => x.code === code);
            if (!l) return '';
            return `<button class="lang-badge" data-listen="${e.id}" data-lang="${code}" title="Odsłuchaj po ${l.label}">${l.flag} ${l.code.toUpperCase()} 🔊</button>`;
        }).join('') : '';

        return `
            <div class="journal-entry" data-id="${e.id}">
                <div class="entry-header">
                    <input type="checkbox" class="entry-select" data-id="${e.id}">
                    <span class="journal-date">${formatDateTime(e.date)}</span>
                    ${e.mood ? `<span class="journal-mood">${moods[e.mood] || ''}</span>` : ''}
                    <div class="entry-actions">
                        <button class="icon-btn" data-listen="${e.id}" data-lang="pl" title="Odsłuchaj po polsku">🔊</button>
                        <button class="icon-btn" data-edit="${e.id}" title="Edytuj">✏️</button>
                        <button class="icon-btn delete" data-delete="${e.id}" title="Usuń">🗑️</button>
                    </div>
                </div>
                <div class="journal-content">${escapeHTML(e.content)}</div>
                ${transBadges ? `<div class="lang-badges">🔊 Odsłuchaj w: ${transBadges}</div>` : ''}
                ${e.translations ? `<div class="entry-translation-view hidden" data-entry="${e.id}"></div>` : ''}
                ${e.editedAt ? `<div class="entry-edited">edytowano: ${formatDateTime(e.editedAt)}</div>` : ''}
            </div>
        `;
    }).join('');

    updateBulkCounter();
}

/* === DELEGOWANE EVENTY NA LIŚCIE === */
$('#journalList').addEventListener('click', (e) => {
    const target = e.target.closest('[data-edit], [data-delete], [data-listen]');
    if (!target) {
        // Klik w checkbox?
        if (e.target.matches('.entry-select')) updateBulkCounter();
        return;
    }

    if (target.dataset.edit) {
        startEditingJournal(target.dataset.edit);
    } else if (target.dataset.delete) {
        const id = target.dataset.delete;
        const entry = state.journal.find(x => x.id === id);
        if (!entry) return;
        if (confirm(`Usunąć wpis z ${formatDate(entry.date.slice(0,10))}?`)) {
            state.journal = state.journal.filter(x => x.id !== id);
            if (editingJournalId === id) resetJournalForm();
            saveState();
            renderJournal();
            toast('🗑️ Wpis usunięty', '', '');
        }
    } else if (target.dataset.listen) {
        const id = target.dataset.listen;
        const lang = target.dataset.lang;
        const entry = state.journal.find(x => x.id === id);
        if (!entry) return;
        let text, bcp;
        if (lang === 'pl') { text = entry.content; bcp = 'pl-PL'; }
        else {
            text = entry.translations?.[lang];
            const l = JOURNAL_LANGS.find(x => x.code === lang);
            bcp = l?.bcp || 'en-GB';
        }
        if (text) speakJournalText(text, bcp, target, id, lang);
    }
});

/* === Przycisk „Zatrzymaj odczyt" + auto-stop przy zmianie zakładki === */
$('#speechStopBtn')?.addEventListener('click', stopJournalSpeak);

$('#journalList').addEventListener('change', (e) => {
    if (e.target.matches('.entry-select')) updateBulkCounter();
});

/* === BULK SELECT + EXPORT === */
function updateBulkCounter() {
    const total = document.querySelectorAll('.entry-select').length;
    const checked = document.querySelectorAll('.entry-select:checked').length;
    $('#bulkCounter').textContent = checked === 0 ? '0 zaznaczonych' : `${checked} z ${total} zaznaczonych`;
    $('#selectAllJournal').checked = checked > 0 && checked === total;
    document.querySelectorAll('.journal-entry').forEach(el => {
        const cb = el.querySelector('.entry-select');
        el.classList.toggle('selected', cb?.checked);
    });
}

$('#selectAllJournal').addEventListener('change', (e) => {
    const checked = e.target.checked;
    document.querySelectorAll('.entry-select').forEach(cb => cb.checked = checked);
    updateBulkCounter();
});

function getSelectedEntries() {
    const ids = Array.from(document.querySelectorAll('.entry-select:checked')).map(el => el.dataset.id);
    return state.journal.filter(e => ids.includes(e.id));
}

const MOOD_LABELS = { 1:'😫 ciężko', 2:'😕 nie najlepiej', 3:'😐 ok', 4:'🙂 dobrze', 5:'🔥 świetnie' };

function entriesToText(entries) {
    let out = `📓 DZIENNIK DZIAŁAŃ — Motywacja bez granic\n`;
    out += `Eksport: ${new Date().toLocaleString('pl-PL')}\n`;
    out += `Liczba wpisów: ${entries.length}\n`;
    out += '═'.repeat(60) + '\n\n';

    entries.forEach((e, i) => {
        const d = new Date(e.date);
        out += `▶ Wpis ${i + 1}: ${d.toLocaleString('pl-PL', { weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}\n`;
        if (e.mood) out += `   Nastrój: ${MOOD_LABELS[e.mood] || e.mood}\n`;
        out += '\n' + e.content + '\n\n';
        if (e.translations) {
            Object.entries(e.translations).forEach(([code, txt]) => {
                const l = JOURNAL_LANGS.find(x => x.code === code);
                if (!l) return;
                out += `--- ${l.flag} ${l.label} ---\n${txt}\n\n`;
            });
        }
        if (e.editedAt) out += `(edytowano: ${new Date(e.editedAt).toLocaleString('pl-PL')})\n`;
        out += '─'.repeat(60) + '\n\n';
    });
    return out;
}

function downloadFile(content, filename, mime = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

$('#exportSelectedJournal').addEventListener('click', () => {
    const entries = getSelectedEntries();
    if (entries.length === 0) {
        toast('Nic nie zaznaczono', 'Zaznacz wpisy do eksportu', 'warning');
        return;
    }
    downloadFile(entriesToText(entries), `dziennik-wybrane-${today()}.txt`);
    toast('⬇️ Eksport gotowy', `${entries.length} wpisów`, 'success');
});

$('#exportAllJournalText').addEventListener('click', () => {
    if (state.journal.length === 0) { toast('Brak wpisów', '', 'warning'); return; }
    downloadFile(entriesToText(state.journal), `dziennik-wszystkie-${today()}.txt`);
    toast('⬇️ Eksport gotowy', `${state.journal.length} wpisów`, 'success');
});

/* === EKSPORT DO DRUKU (HTML) === */
function entriesToPrintableHTML(entries) {
    const rows = entries.map((e, i) => {
        const d = new Date(e.date);
        let html = `<article class="entry">`;
        html += `<header class="entry-h">
            <span class="entry-no">#${i + 1}</span>
            <h2>${d.toLocaleDateString('pl-PL', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</h2>
            <span class="entry-time">${d.toLocaleTimeString('pl-PL', { hour:'2-digit', minute:'2-digit' })}</span>
            ${e.mood ? `<span class="entry-mood">${MOOD_LABELS[e.mood] || ''}</span>` : ''}
        </header>`;
        html += `<div class="entry-body">${escapeHTML(e.content).replace(/\n/g, '<br>')}</div>`;
        if (e.translations) {
            Object.entries(e.translations).forEach(([code, txt]) => {
                const l = JOURNAL_LANGS.find(x => x.code === code);
                if (!l) return;
                html += `<div class="entry-trans"><div class="trans-head">${l.flag} ${l.label}</div><div>${escapeHTML(txt).replace(/\n/g, '<br>')}</div></div>`;
            });
        }
        if (e.editedAt) html += `<div class="entry-edited">edytowano: ${new Date(e.editedAt).toLocaleString('pl-PL')}</div>`;
        html += `</article>`;
        return html;
    }).join('');

    return `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><title>Dziennik działań</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;1,400&display=swap');
    * { box-sizing: border-box; }
    body { font-family: 'Fraunces', Georgia, serif; max-width: 760px; margin: 40px auto; padding: 30px;
        color: #1a1a1a; line-height: 1.65; background: #fafaf7; }
    h1 { font-size: 32px; border-bottom: 3px solid #6366f1; padding-bottom: 12px; margin-bottom: 8px;
        font-weight: 900; letter-spacing: -0.02em; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 36px; font-style: italic; }
    .entry { page-break-inside: avoid; margin-bottom: 28px; padding: 22px 26px;
        border-left: 4px solid #6366f1; background: white; border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .entry-h { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
        border-bottom: 1px dashed #e5e7eb; padding-bottom: 10px; margin-bottom: 14px; }
    .entry-no { font-size: 12px; color: #6366f1; font-weight: 700; }
    .entry-h h2 { font-size: 18px; margin: 0; font-weight: 600; flex: 1; }
    .entry-time { font-size: 13px; color: #6b7280; font-family: monospace; }
    .entry-mood { font-size: 16px; }
    .entry-body { white-space: pre-wrap; font-size: 15px; }
    .entry-trans { margin-top: 14px; padding: 12px 14px; background: #f3f4f6;
        border-radius: 4px; border-left: 2px solid #8b5cf6; font-size: 14px; }
    .trans-head { color: #6366f1; font-weight: 600; font-size: 12px;
        text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .entry-edited { color: #9ca3af; font-size: 11px; margin-top: 8px; font-style: italic; text-align: right; }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 12px 22px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white;
        border: none; border-radius: 8px; cursor: pointer; font-size: 14px;
        box-shadow: 0 4px 12px rgba(99,102,241,0.4); font-weight: 600; }
    .print-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(99,102,241,0.5); }
    @media print {
        body { background: white; max-width: none; margin: 0; padding: 20mm; }
        .no-print { display: none !important; }
        .entry { box-shadow: none; border: 1px solid #e5e7eb; }
    }
</style>
</head><body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Drukuj / Zapisz jako PDF</button>
    <h1>📓 Dziennik działań</h1>
    <div class="meta">Eksport: ${new Date().toLocaleString('pl-PL')} • ${entries.length} wpisów</div>
    ${rows}
</body></html>`;
}

$('#exportAllJournalPrint').addEventListener('click', () => {
    if (state.journal.length === 0) { toast('Brak wpisów', '', 'warning'); return; }
    const html = entriesToPrintableHTML(state.journal);
    const win = window.open('', '_blank');
    if (!win) {
        // Pop-up zablokowany — fallback: pobierz plik HTML
        downloadFile(html, `dziennik-${today()}.html`, 'text/html;charset=utf-8');
        toast('Pop-up zablokowany', 'Pobrałem plik HTML — otwórz go ręcznie', 'warning');
        return;
    }
    win.document.write(html);
    win.document.close();
    toast('🖨️ Gotowe', 'Kliknij „Drukuj" lub zapisz jako PDF', 'success');
});

/* =============================================================
   STATYSTYKI
   ============================================================= */
let chartWeekly = null;
let chartMonthly = null;

function renderStats() {
    const done = state.tasks.filter(t => t.status === 'done').length;
    const totalSec = state.activities.reduce((sum, a) => sum + a.duration, 0);

    $('#statTotalTasks').textContent = state.tasks.length;
    $('#statCompletedTasks').textContent = done;
    $('#statTotalTime').textContent = `${(totalSec / 3600).toFixed(1)}h`;

    // Średnia dzienna = łączny czas / liczba unikalnych dni aktywności
    const uniqueDays = new Set(state.activities.map(a => a.start.slice(0, 10))).size || 1;
    $('#statAvgDay').textContent = `${Math.floor(totalSec / uniqueDays / 60)}m`;

    renderWeeklyChart();
    renderMonthlyChart();
    renderAIInsight();
}

function renderWeeklyChart() {
    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        labels.push(d.toLocaleDateString('pl-PL', { weekday: 'short' }));
        const sum = state.activities
            .filter(a => a.start.slice(0, 10) === iso)
            .reduce((s, a) => s + a.duration, 0);
        data.push((sum / 60).toFixed(0)); // minuty
    }

    if (chartWeekly) chartWeekly.destroy();
    chartWeekly = new Chart($('#chartWeekly'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Minuty pracy',
                data,
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: '#6366f1',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: chartOptions('min')
    });
}

function renderMonthlyChart() {
    const labels = [];
    const data = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        labels.push(d.getDate());
        const count = state.tasks.filter(t => t.completedAt && t.completedAt.slice(0, 10) === iso).length;
        data.push(count);
    }

    if (chartMonthly) chartMonthly.destroy();
    chartMonthly = new Chart($('#chartMonthly'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Ukończone zadania',
                data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#10b981',
                pointRadius: 3
            }]
        },
        options: chartOptions('zad')
    });
}

function chartOptions(unit) {
    return {
        responsive: true,
        plugins: {
            legend: { labels: { color: '#8b95a7' } }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { color: '#8b95a7', callback: v => v + ' ' + unit },
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            x: {
                ticks: { color: '#8b95a7' },
                grid: { display: false }
            }
        }
    };
}

// Prosta analiza "AI" — wykrywa wzorce w danych i podpowiada
function renderAIInsight() {
    const el = $('#aiInsight');
    if (state.activities.length < 3) {
        el.textContent = 'Potrzebuję więcej danych. Wykonaj kilka sesji, a dostaniesz analizę.';
        return;
    }

    const insights = [];

    // Najbardziej produktywna godzina dnia
    const hourMap = {};
    state.activities.forEach(a => {
        const h = new Date(a.start).getHours();
        hourMap[h] = (hourMap[h] || 0) + a.duration;
    });
    const bestHour = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0];
    if (bestHour) {
        insights.push(`🕐 Najwięcej pracujesz o <b>${bestHour[0]}:00</b>. Planuj deep work w tym oknie.`);
    }

    // Średnia długość sesji
    const avgLen = state.activities.reduce((s, a) => s + a.duration, 0) / state.activities.length;
    if (avgLen < 900) {
        insights.push(`⚠️ Twoje sesje są krótkie (średnio ${Math.floor(avgLen / 60)} min). Spróbuj metody <b>Pomodoro 25/5</b>, by wydłużyć skupienie.`);
    } else if (avgLen > 3600) {
        insights.push(`🧠 Utrzymujesz <b>głęboką pracę</b> ponad godzinę. Świetnie — nie zapomnij o przerwach.`);
    }

    // Analiza streaka
    if (state.gamification.streak >= 7) {
        insights.push(`🔥 <b>Streak ${state.gamification.streak} dni</b> — jesteś w strefie. Nie przerywaj.`);
    } else if (state.gamification.streak === 0) {
        insights.push(`💡 Brak streaka. Najtrudniejszy jest <b>pierwszy dzień</b>. Zrób dziś choć jedno małe zadanie.`);
    }

    // Analiza produktywności tygodnia
    const last7 = state.activities.filter(a => Date.now() - new Date(a.start).getTime() < 7 * 86400000);
    const totalMin = last7.reduce((s, a) => s + a.duration, 0) / 60;
    insights.push(`📈 W tym tygodniu: <b>${Math.floor(totalMin)} minut skupionej pracy</b> w ${last7.length} sesjach.`);

    el.innerHTML = insights.join('<br><br>');
}

/* =============================================================
   OSIĄGNIĘCIA
   ============================================================= */
function renderAchievements() {
    const grid = $('#achievementsGrid');
    grid.innerHTML = ACHIEVEMENTS.map(a => {
        const unlocked = state.gamification.achievements.includes(a.id);
        return `
            <div class="achievement ${unlocked ? 'unlocked' : ''}">
                <div class="achievement-icon">${a.icon}</div>
                <div class="achievement-name">${a.name}</div>
                <div class="achievement-desc">${a.desc}</div>
            </div>
        `;
    }).join('');
}

/* =============================================================
   WYZWANIA
   ============================================================= */
const CHALLENGE_TEMPLATES = {
    '7days':    { name: '7 dni bez wymówek',  days: 7,  check: 'task' },
    '30days':   { name: '30 dni deep work',   days: 30, check: 'timer' },
    '21journal':{ name: '21 dni dziennika',   days: 21, check: 'journal' }
};

$$('[data-challenge]').forEach(btn => {
    btn.addEventListener('click', () => {
        const tmpl = btn.dataset.challenge;
        const config = CHALLENGE_TEMPLATES[tmpl];
        if (state.challenges.some(c => c.template === tmpl && !isChallengeDone(c))) {
            toast('To wyzwanie już trwa', '', 'warning');
            return;
        }
        state.challenges.push({
            id: uid(),
            template: tmpl,
            name: config.name,
            days: config.days,
            check: config.check,
            startDate: today(),
            doneDates: []
        });
        saveState();
        toast(`🔥 Wyzwanie rozpoczęte: ${config.name}`, `${config.days} dni. Dasz radę.`, 'success');
        renderChallenges();
    });
});

function isChallengeDone(c) {
    return c.doneDates.length >= c.days;
}

function updateChallengeProgress(type) {
    const t = today();
    state.challenges.forEach(c => {
        if (c.check !== type) return;
        if (isChallengeDone(c)) return;
        if (!c.doneDates.includes(t)) {
            c.doneDates.push(t);
            if (isChallengeDone(c)) {
                addXP(500);
                toast('🏆 Wyzwanie ukończone!', `${c.name} — +500 XP bonusu!`, 'success');
            }
        }
    });
    saveState();
}

function renderChallenges() {
    const list = $('#activeChallenges');
    if (state.challenges.length === 0) {
        list.innerHTML = '<div class="empty-state">Brak aktywnych wyzwań. Wybierz jedno z powyższych.</div>';
        return;
    }
    list.innerHTML = state.challenges.map(c => {
        const dots = Array.from({ length: c.days }, (_, i) =>
            `<div class="challenge-dot ${i < c.doneDates.length ? 'done' : ''}"></div>`
        ).join('');
        const pct = Math.round((c.doneDates.length / c.days) * 100);
        return `
            <div class="challenge-progress">
                <strong>${c.name}</strong> — ${c.doneDates.length}/${c.days} dni (${pct}%)
                <div class="challenge-dots">${dots}</div>
            </div>
        `;
    }).join('');
}

/* =============================================================
   DASHBOARD
   ============================================================= */
function renderDashboard() {
    const t = today();
    const todayTasks = state.tasks.filter(tk => tk.completedAt && tk.completedAt.slice(0, 10) === t).length;
    const todaySec = state.activities
        .filter(a => a.start.slice(0, 10) === t)
        .reduce((s, a) => s + a.duration, 0);
    const todayXPval = todayTasks * 25 + Math.floor(todaySec / 60);

    $('#todayTasks').textContent = todayTasks;
    $('#todayTime').textContent = `${Math.floor(todaySec / 60)}m`;
    $('#todayXP').textContent = todayXPval;

    // Cel dzienny (pasek małych zwycięstw)
    const goal = state.settings.dailyGoal;
    const pct = Math.min(100, (todayTasks / goal) * 100);
    $('#dailyGoalFill').style.width = pct + '%';
    if (todayTasks >= goal) {
        $('#dailyGoalTxt').textContent = `🎉 Cel osiągnięty! ${todayTasks}/${goal} zadań`;
    } else {
        $('#dailyGoalTxt').textContent = `${todayTasks} / ${goal} zadań — zostało ${goal - todayTasks}`;
    }

    // Streak
    $('#streakBig').textContent = state.gamification.streak;

    // Ostrzeżenie o streaku
    const last = state.gamification.lastActiveDate;
    if (last && last !== t && state.gamification.streak > 0) {
        const daysDiff = Math.floor((new Date(t) - new Date(last)) / 86400000);
        if (daysDiff === 0)      $('#streakWarn').textContent = '';
        else if (daysDiff === 1) $('#streakWarn').textContent = '⚠️ Zrób coś dziś — inaczej stracisz streak!';
        else                     $('#streakWarn').textContent = '❌ Streak przerwany.';
    } else {
        $('#streakWarn').textContent = '';
    }

    // Cytat dnia
    $('#dailyQuote').textContent = `"${getDailyQuote()}"`;

    // Powitanie zależne od pory dnia
    const h = new Date().getHours();
    const greet = h < 12 ? 'Dzień dobry' : h < 18 ? 'Cześć' : 'Dobry wieczór';
    $('#greeting').textContent = `${greet} 👋 Czas na działanie.`;

    // Aktywne zadania w karcie
    const active = state.tasks.filter(tk => tk.status === 'active').slice(0, 5);
    const miniList = $('#activeTasksList');
    if (active.length === 0) {
        miniList.innerHTML = '<div class="empty-state">Brak aktywnych zadań. Dodaj nowe!</div>';
    } else {
        miniList.innerHTML = active.map(tk => `
            <div class="task-item">
                <div class="task-check" onclick="toggleTask('${tk.id}')"></div>
                <div class="task-info">
                    <div class="task-title">${escapeHTML(tk.title)}</div>
                    <div class="task-meta">
                        ${tk.endDate ? `<span>📅 ${formatDate(tk.endDate)}</span>` : ''}
                        <span class="task-xp">💎 ${tk.points} XP</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Aktualizuj wyzwania oparte na zadaniach/timerze
    if (todayTasks > 0) updateChallengeProgress('task');
    if (todaySec >= 1800) updateChallengeProgress('timer');

    // Karty Dziś / Jutro / Pojutrze
    renderThreeDays();

    // Pomodoro UI (aktywne odliczanie vs przyciski)
    renderPomodoroUI();
}

/* =============================================================
   NAGŁÓWEK (XP, LEVEL, STREAK, PUNKTY)
   ============================================================= */
function renderHeader() {
    const g = state.gamification;
    $('#userLevel').textContent = g.level;
    $('#userStreak').textContent = g.streak;
    $('#userPoints').textContent = g.points;

    const prog = xpProgress();
    $('#xpFill').style.width = prog.percent + '%';
    $('#xpText').textContent = `${prog.have} / ${prog.need} XP`;

    $('#todayDate').textContent = new Date().toLocaleDateString('pl-PL', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
}

/* =============================================================
   USTAWIENIA + EKSPORT / IMPORT
   ============================================================= */
$('#saveDailyGoal').addEventListener('click', () => {
    const val = Number($('#dailyGoalInput').value);
    if (val > 0) {
        state.settings.dailyGoal = val;
        saveState();
        toast('Cel zapisany', `${val} zadań dziennie`, 'success');
        renderDashboard();
    }
});

$('#notifToggle').addEventListener('change', async (e) => {
    if (e.target.checked) {
        if ('Notification' in window) {
            const perm = await Notification.requestPermission();
            state.settings.notifications = perm === 'granted';
            if (perm !== 'granted') {
                e.target.checked = false;
                toast('Brak zgody', 'Pozwól na powiadomienia w ustawieniach przeglądarki', 'warning');
            }
        }
    } else {
        state.settings.notifications = false;
    }
    saveState();
});

// EKSPORT — pełny zrzut stanu do pliku JSON
$('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mbg-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('💾 Eksport gotowy', 'Plik został pobrany', 'success');
});

// IMPORT — wczytanie stanu z pliku
$('#importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const imported = JSON.parse(ev.target.result);
            if (!imported.tasks || !imported.gamification) throw new Error('Nieprawidłowy format');
            if (!confirm('Import nadpisze bieżące dane. Kontynuować?')) return;
            state = deepMerge(structuredClone(DEFAULT_STATE), imported);
            saveState();
            toast('✅ Import udany', 'Dane wczytane. Odświeżam...', 'success');
            setTimeout(() => location.reload(), 1200);
        } catch (err) {
            toast('❌ Błąd importu', err.message, 'danger');
        }
    };
    reader.readAsText(file);
});

// Eksport kompaktowego JSON dla widgetu Apple Watch / Scriptable
$('#exportWidget')?.addEventListener('click', () => {
    const data = {
        streak: state.gamification.streak,
        level: state.gamification.level,
        points: state.gamification.points,
        xp: state.gamification.xp,
        lastActive: state.gamification.lastActiveDate || today(),
        updatedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mbg-widget-data.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('📲 JSON gotowy', 'Wrzuć go do GitHub Gist lub iCloud Drive', 'success');
});

$('#resetAll').addEventListener('click', () => {
    if (!confirm('Wszystkie dane zostaną skasowane. Na pewno?')) return;
    if (!confirm('Ostatnia szansa. Naprawdę zresetować?')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
});

/* =============================================================
   TRYB FOCUS (fullscreen, minimalizacja rozpraszaczy)
   ============================================================= */
$('#toggleFocus').addEventListener('click', () => {
    if (!state.timer.running) {
        toast('Uruchom timer', 'Focus wymaga aktywnej sesji', 'warning');
        switchView('timer');
        return;
    }
    $('#focusMode').classList.remove('hidden');
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }
});

$('#exitFocus').addEventListener('click', () => {
    $('#focusMode').classList.add('hidden');
    if (document.fullscreenElement) document.exitFullscreen();
    stopTimer();
});

/* =============================================================
   PRZYPOMNIENIA (co 30 min jeśli włączone)
   ============================================================= */
setInterval(() => {
    if (!state.settings.notifications) return;
    if (state.timer.running) return; // nie przeszkadzaj w trakcie sesji
    const last = state.gamification.lastActiveDate;
    if (last === today()) return;
    const h = new Date().getHours();
    if (h < 9 || h > 21) return; // przypominaj w ludzkich godzinach
    toast('⏰ Hej!', 'Nie wykonałeś jeszcze żadnego zadania dziś. Zacznij teraz.', 'warning');
}, 30 * 60 * 1000);

/* =============================================================
   NAWYKI — CRUD + GRID 30-DNIOWY
   (inspirowane: Moje_Habit_Template.xlsx)
   ============================================================= */

// Zaseeduj domyślne nawyki przy pierwszym uruchomieniu
function seedDefaultHabits() {
    if (state.habitsSeeded) return;
    DEFAULT_HABITS.forEach(h => {
        state.habits.push({ id: uid(), ...h, doneDates: [] });
    });
    state.habitsSeeded = true;
    saveState();
}

// Oblicz streak dla konkretnego nawyku (kolejne dni z rzędu do dziś)
function habitStreak(habit) {
    const dates = new Set(habit.doneDates);
    let streak = 0;
    const d = new Date();
    while (dates.has(d.toISOString().slice(0, 10))) {
        streak++;
        d.setDate(d.getDate() - 1);
    }
    return streak;
}

// Toggle nawyku na dany dzień (klik w kropkę w gridzie)
function toggleHabitDay(habitId, isoDate) {
    const h = state.habits.find(x => x.id === habitId);
    if (!h) return;
    const idx = h.doneDates.indexOf(isoDate);
    if (idx >= 0) {
        h.doneDates.splice(idx, 1);
    } else {
        h.doneDates.push(isoDate);
        if (isoDate === today()) {
            addXP(5);
            updateStreak();
        }
    }
    saveState();
    renderHabits();
    renderDashboard();
}

// Renderuje listę nawyków z 14-dniowym gridem (mieści się w 2 tygodniach)
function renderHabits() {
    seedDefaultHabits();

    const daily = state.habits.filter(h => h.type === 'daily');
    ['morning', 'day', 'night'].forEach(group => {
        const container = $(`#habits${group[0].toUpperCase() + group.slice(1)}`);
        if (!container) return;
        const list = daily.filter(h => h.group === group);
        if (list.length === 0) {
            container.innerHTML = '<div class="empty-state">Brak nawyków. Dodaj nowy powyżej.</div>';
            return;
        }
        container.innerHTML = list.map(renderHabitRow).join('');
    });

    // Miesięczne
    const monthly = state.habits.filter(h => h.type === 'monthly');
    const mList = $('#monthlyHabitsList');
    if (mList) {
        mList.innerHTML = monthly.length
            ? monthly.map(renderHabitRow).join('')
            : '<div class="empty-state">Brak nawyków miesięcznych.</div>';
    }

    // Hydration i heatmap
    renderHydration();
    renderHeatmap();
}

function renderHabitRow(h) {
    const t = today();
    const doneSet = new Set(h.doneDates);
    const doneToday = doneSet.has(t);
    const days = h.historyDays || 14;
    const streak = habitStreak(h);

    // Generuj kropki historii
    let dots = '';
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const isToday = iso === t;
        const done = doneSet.has(iso);
        const dateLabel = d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
        dots += `<div class="habit-dot ${done ? 'done' : ''} ${isToday ? 'today' : ''}"
                      title="${dateLabel}${done ? ' — zrobione (klik = cofnij)' : ' (klik = zaznacz)'}"
                      onclick="toggleHabitDay('${h.id}', '${iso}')"></div>`;
    }

    // Klasa CSS dla siatki — dopasuj do liczby dni
    const colsClass = days <= 7 ? 'cols-7' : days <= 14 ? 'cols-14' : days <= 30 ? 'cols-15' : 'cols-20';

    return `
        <div class="habit-row ${doneToday ? 'done-today' : ''}">
            <div class="habit-icon">${h.icon}</div>
            <div class="habit-main">
                <div class="habit-name">${escapeHTML(h.name)}</div>
                <div class="habit-meta">
                    <span class="habit-streak">🔥 ${streak}<small>dni z rzędu</small></span>
                    <button class="habit-history-btn" onclick="toggleHabitHistory('${h.id}', this)">
                        📊 Historia ${days} dni ▾
                    </button>
                </div>
                <div class="habit-history hidden" id="hist-${h.id}">
                    <div class="habit-dots ${colsClass}">${dots}</div>
                    <p class="habit-history-hint">Każdy kwadracik = jeden dzień. Klik = zmień status dla tego dnia. Zielony = zrobione.</p>
                </div>
            </div>
            <button class="habit-today-btn ${doneToday ? 'done' : ''}" onclick="toggleHabitDay('${h.id}', '${t}')">
                ${doneToday ? '✅' : '✓'}
                <small>${doneToday ? 'Zrobione' : 'Zaznacz dziś'}</small>
            </button>
            <div class="habit-actions">
                <button class="icon-btn" onclick="editHabit('${h.id}')" title="Edytuj">✏️</button>
                <button class="icon-btn delete" onclick="deleteHabit('${h.id}')" title="Usuń">🗑️</button>
            </div>
        </div>
    `;
}

function toggleHabitHistory(id, btn) {
    const el = document.getElementById('hist-' + id);
    if (!el) return;
    const isHidden = el.classList.toggle('hidden');
    btn.classList.toggle('expanded', !isHidden);
    btn.innerHTML = btn.innerHTML.replace(/▾|▴/, isHidden ? '▾' : '▴');
}

function deleteHabit(id) {
    const h = state.habits.find(x => x.id === id);
    if (!h) return;
    if (!confirm(`Usunąć nawyk „${h.name}"?\nHistoria wykonań zostanie utracona.`)) return;
    state.habits = state.habits.filter(x => x.id !== id);
    saveState();
    renderHabits();
    toast('🗑️ Nawyk usunięty', h.name, '');
}

function editHabit(id) {
    const h = state.habits.find(x => x.id === id);
    if (!h) return;
    openHabitModal(h);
}

/* === MODAL NAWYKU === */
const HABIT_ICONS = ['✨','💪','🧠','🧘','📚','🏃','💧','🥗','😴','🪥','🧘‍♂️','☕','🎯','💻','✍️','📿','🎨','🎵','🌱','🧹','💊','🚴','🏋️','🌅','🌙','💡','⚡','🔥','❤️','🙏'];

let editingHabitId = null;

function openHabitModal(habit = null) {
    const isEdit = !!habit;
    editingHabitId = isEdit ? habit.id : null;

    const selectedIcon = habit?.icon || '✨';
    $('#habitName').value = habit?.name || '';
    $('#habitIcon').value = selectedIcon;
    $('#habitGroup').value = habit?.group || 'day';
    $('#habitType').value = habit?.type || 'daily';
    $('#habitHistoryDays').value = String(habit?.historyDays || 14);

    const grid = $('#habitIconGrid');
    grid.innerHTML = HABIT_ICONS.map(i =>
        `<button class="icon-pick ${i === selectedIcon ? 'selected' : ''}" data-icon="${i}">${i}</button>`
    ).join('');
    grid.querySelectorAll('.icon-pick').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            grid.querySelectorAll('.icon-pick').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            $('#habitIcon').value = btn.dataset.icon;
        });
    });

    // Aktualizuj tytuł i przycisk zapisu
    const modal = $('#habitModal');
    modal.querySelector('h3').textContent = isEdit ? '✏️ Edytuj nawyk' : 'Nowy nawyk';
    $('#saveHabit').textContent = isEdit ? '💾 Zaktualizuj' : 'Zapisz nawyk';

    modal.classList.remove('hidden');
}

$('#openAddHabit')?.addEventListener('click', () => openHabitModal());
$('#addMonthlyHabit')?.addEventListener('click', () => {
    openHabitModal();
    $('#habitType').value = 'monthly';
});
$('#cancelHabit')?.addEventListener('click', () => {
    $('#habitModal').classList.add('hidden');
    editingHabitId = null;
});

$('#saveHabit')?.addEventListener('click', () => {
    const name = $('#habitName').value.trim();
    if (!name) { toast('Podaj nazwę', '', 'warning'); return; }

    const data = {
        name,
        icon: $('#habitIcon').value,
        group: $('#habitGroup').value,
        type: $('#habitType').value,
        historyDays: Number($('#habitHistoryDays').value) || 14
    };

    if (editingHabitId) {
        const h = state.habits.find(x => x.id === editingHabitId);
        if (h) Object.assign(h, data); // zachowaj doneDates i id
        toast('✅ Nawyk zaktualizowany', name, 'success');
    } else {
        state.habits.push({ id: uid(), ...data, doneDates: [] });
        toast('✅ Nawyk dodany', name, 'success');
    }

    saveState();
    $('#habitModal').classList.add('hidden');
    editingHabitId = null;
    renderHabits();
});

// Przełączanie zakładek (Codzienne / Hydracja / Heatmap / Miesięczne)
$$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $$('.habit-tab').forEach(t => t.classList.remove('active'));
        $(`#tab-${btn.dataset.tab}`).classList.add('active');
        if (btn.dataset.tab === 'heatmap') renderHeatmap();
    });
});

/* =============================================================
   HYDRATION TRACKER
   (8 slotów jak w xlsx: 7:00 Good Morning → 21:00 YOU DID IT!)
   ============================================================= */

function getTodayHydration() {
    const t = today();
    if (!state.hydration[t]) state.hydration[t] = [false, false, false, false, false, false, false, false];
    return state.hydration[t];
}

function toggleHydrationSlot(idx) {
    const slots = getTodayHydration();
    slots[idx] = !slots[idx];
    saveState();
    if (slots[idx]) {
        addXP(10);
        toast(`💧 +10 XP`, HYDRATION_SLOTS[idx].label, 'success');
        // Automatycznie zaznacz nawyk "Wypić 2 litry wody" gdy wszystkie 8 slotów
        if (slots.filter(Boolean).length === 8) {
            const waterHabit = state.habits.find(h => h.name.toLowerCase().includes('wody'));
            if (waterHabit && !waterHabit.doneDates.includes(today())) {
                waterHabit.doneDates.push(today());
                toast('🏆 Cel 2L osiągnięty!', 'Nawyk "Wypić 2 litry wody" zaliczony', 'success');
            }
        }
    }
    renderHydration();
}

function renderHydration() {
    const slots = getTodayHydration();
    const container = $('#hydrationSlots');
    if (!container) return;

    container.innerHTML = HYDRATION_SLOTS.map((s, i) => `
        <div class="hydration-slot ${slots[i] ? 'done' : ''}" onclick="toggleHydrationSlot(${i})">
            <span class="slot-emoji">${s.emoji}</span>
            <div class="slot-time">${s.time}</div>
            <div class="slot-label">${s.label}</div>
            <div class="slot-ml">${slots[i] ? '✓ 250 ml' : '+ 250 ml'}</div>
        </div>
    `).join('');

    const filled = slots.filter(Boolean).length;
    const ml = filled * 250;
    $('#hydrationMl').textContent = ml;
    $('#hydrationFill').style.height = (filled / 8 * 100) + '%';

    const tags = [
        'Kliknij pierwszy slot, by zacząć dzień',
        '💧 Dobry start! Jeszcze 7 szklanek.',
        '💧 2 szklanki już w Tobie — idź dalej.',
        '💧 Ćwierć drogi!',
        '💪 Półmetek! Połowa celu za Tobą.',
        '🔥 5/8 — mocno jedziesz!',
        '🚀 Jeszcze 2 szklanki i będzie 2L.',
        '⭐ Prawie meta!',
        '🏆 YOU DID IT! Cel 2L osiągnięty!'
    ];
    $('#hydrationTag').textContent = tags[filled];

    renderHydrationChart();
}

let chartHydro = null;
function renderHydrationChart() {
    const canvas = $('#chartHydration');
    if (!canvas) return;
    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        labels.push(d.toLocaleDateString('pl-PL', { weekday: 'short' }));
        const filled = (state.hydration[iso] || []).filter(Boolean).length;
        data.push(filled * 250);
    }
    if (chartHydro) chartHydro.destroy();
    chartHydro = new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets: [{
            label: 'ml wypite',
            data,
            backgroundColor: 'rgba(14, 165, 233, 0.6)',
            borderColor: '#0ea5e9',
            borderWidth: 2,
            borderRadius: 6
        }]},
        options: chartOptions('ml')
    });
}

/* =============================================================
   HEATMAP (GitHub-style) — 13 tygodni nawyków
   ============================================================= */
function renderHeatmap() {
    const container = $('#heatmapContainer');
    if (!container) return;
    const weeks = 13;
    const now = new Date();
    // Znajdź poniedziałek 12 tygodni wstecz, by grid zaczynał się w pon
    const start = new Date(now);
    start.setDate(start.getDate() - (weeks * 7 - 1));
    const day = start.getDay() === 0 ? 6 : start.getDay() - 1; // Pn=0
    start.setDate(start.getDate() - day);

    let html = '';
    for (let w = 0; w < weeks; w++) {
        html += '<div class="heatmap-week">';
        for (let d = 0; d < 7; d++) {
            const cur = new Date(start);
            cur.setDate(cur.getDate() + w * 7 + d);
            const iso = cur.toISOString().slice(0, 10);
            const count = countDayActivity(iso);
            const lvl = count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4;
            const isFuture = cur > now;
            html += `<div class="heatmap-cell lvl-${isFuture ? 0 : lvl}" title="${iso} — ${count} wykonań"></div>`;
        }
        html += '</div>';
    }
    container.innerHTML = html;
}

// Ile aktywności wykonano danego dnia (nawyki + zadania + sesje + wpisy + hydration)
function countDayActivity(iso) {
    let n = 0;
    state.habits.forEach(h => { if (h.doneDates.includes(iso)) n++; });
    n += state.tasks.filter(t => t.completedAt && t.completedAt.slice(0, 10) === iso).length;
    n += state.activities.filter(a => a.start.slice(0, 10) === iso).length;
    n += state.journal.filter(j => j.date.slice(0, 10) === iso).length;
    if (state.hydration[iso]?.some(Boolean)) n++;
    return n;
}

/* =============================================================
   KALENDARZ + PLANER (inspirowane Do_zrobienia.xlsx)
   ============================================================= */

// Domyślnie pokazuj bieżący miesiąc
function getCalendarCursor() {
    if (!state.settings.calendarCursor) {
        const d = new Date();
        state.settings.calendarCursor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    }
    return new Date(state.settings.calendarCursor);
}

function setCalendarCursor(d) {
    state.settings.calendarCursor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    saveState();
    renderCalendar();
}

// Zwróć zadania przypisane do danego dnia (po endDate)
function tasksOnDate(iso) {
    return state.tasks.filter(t => t.endDate === iso);
}

// "Za X dni" — skrót tekstowy (dziś / jutro / pojutrze / za 5 dni / 3 dni temu)
function daysUntilLabel(isoDate) {
    const t = new Date(today());
    const d = new Date(isoDate);
    const diff = Math.round((d - t) / 86400000);
    if (diff === 0) return 'Dziś';
    if (diff === 1) return 'Jutro';
    if (diff === 2) return 'Pojutrze';
    if (diff > 2)   return `Za ${diff} dni`;
    if (diff === -1) return 'Wczoraj';
    return `${Math.abs(diff)} dni temu`;
}

function countdownClass(isoDate, status) {
    if (status === 'done') return 'done';
    const t = new Date(today());
    const d = new Date(isoDate);
    const diff = Math.round((d - t) / 86400000);
    if (diff < 0)  return 'overdue';
    if (diff === 0) return 'today';
    if (diff === 1) return 'tomorrow';
    return '';
}

function renderCalendar() {
    const cursor = getCalendarCursor();
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    $('#calMonthLabel').textContent = cursor.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

    // Pierwszy wyświetlony dzień (poniedziałek tygodnia pierwszego dnia miesiąca)
    const first = new Date(year, month, 1);
    const firstDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - firstDay);

    const t = today();
    let html = '';
    for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        const iso = d.toISOString().slice(0, 10);
        const dayTasks = tasksOnDate(iso);
        const otherMonth = d.getMonth() !== month;
        const isToday = iso === t;
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const hasOverdue = dayTasks.some(x => x.status === 'active' && iso < t);

        // Do 2 zadań widoczne w kratce, reszta jako "+N"
        const visibleTasks = dayTasks.slice(0, 2).map(task => {
            const cls = task.status === 'done' ? 'done' : (iso < t ? 'overdue' : '');
            return `<div class="cal-day-task ${cls}">${escapeHTML(task.title)}</div>`;
        }).join('');
        const more = dayTasks.length > 2 ? `<div class="cal-day-task-more">+${dayTasks.length - 2} więcej</div>` : '';

        html += `
            <div class="cal-day ${otherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''} ${hasOverdue ? 'has-overdue' : ''}"
                 onclick="showDayDetail('${iso}')">
                <div class="cal-day-num">${d.getDate()}</div>
                ${visibleTasks}
                ${more}
            </div>
        `;
    }
    $('#calGrid').innerHTML = html;

    renderPlannedList();
}

// Widok szczegółów dnia pod kalendarzem
let selectedDay = null;
function showDayDetail(iso) {
    selectedDay = iso;
    $$('.cal-day').forEach(el => el.classList.remove('selected'));
    const card = $('#dayDetailCard');
    card.classList.remove('hidden');
    const date = new Date(iso);
    $('#dayDetailTitle').textContent = '📅 ' + date.toLocaleDateString('pl-PL', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const dayTasks = tasksOnDate(iso);
    const container = $('#dayDetailTasks');
    if (dayTasks.length === 0) {
        container.innerHTML = '<div class="empty-state">Brak zaplanowanych zadań na ten dzień.</div>';
    } else {
        container.innerHTML = dayTasks.map(task => `
            <div class="task-item ${task.status === 'done' ? 'done' : ''}">
                <div class="task-check ${task.status === 'done' ? 'checked' : ''}" onclick="toggleTask('${task.id}')">
                    ${task.status === 'done' ? '✓' : ''}
                </div>
                <div class="task-info">
                    <div class="task-title">${escapeHTML(task.title)}</div>
                    <div class="task-meta">
                        <span class="task-xp">💎 ${task.points} XP</span>
                    </div>
                </div>
                <button class="icon-btn delete" onclick="deleteTask('${task.id}')">🗑️</button>
            </div>
        `).join('');
    }
}

$('#addTaskToDay')?.addEventListener('click', () => {
    if (!selectedDay) return;
    openTaskModal();
    $('#taskEnd').value = selectedDay;
});

// Lista zaplanowanych zadań (filtrowana: nadchodzące/zaległe/zrobione/wszystkie)
let planFilter = 'upcoming';
$$('[data-plan-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
        $$('[data-plan-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        planFilter = btn.dataset.planFilter;
        renderPlannedList();
    });
});

function renderPlannedList() {
    const container = $('#plannedList');
    if (!container) return;
    const t = today();
    let list = state.tasks.filter(task => task.endDate);

    if (planFilter === 'upcoming') list = list.filter(task => task.endDate >= t && task.status !== 'done');
    if (planFilter === 'overdue')  list = list.filter(task => task.endDate < t && task.status !== 'done');
    if (planFilter === 'done')     list = list.filter(task => task.status === 'done');

    // Sortuj po dacie
    list.sort((a, b) => a.endDate.localeCompare(b.endDate));

    if (list.length === 0) {
        container.innerHTML = '<div class="empty-state">Brak zadań w tej kategorii. Zaplanuj coś na konkretny dzień.</div>';
        return;
    }

    container.innerHTML = list.map(task => {
        const overdue = task.status === 'active' && task.endDate < t;
        const cdClass = countdownClass(task.endDate, task.status);
        return `
            <div class="planned-item ${task.status === 'done' ? 'done' : ''} ${overdue ? 'overdue' : ''}">
                <div class="task-check ${task.status === 'done' ? 'checked' : ''}" onclick="toggleTask('${task.id}')">
                    ${task.status === 'done' ? '✓' : ''}
                </div>
                <div>
                    <div class="planned-title">${escapeHTML(task.title)}</div>
                    <div class="planned-date">${formatDate(task.endDate)} • 💎 ${task.points} XP</div>
                </div>
                <div class="planned-countdown ${cdClass}">${daysUntilLabel(task.endDate)}</div>
                <button class="icon-btn delete" onclick="deleteTask('${task.id}')">🗑️</button>
            </div>
        `;
    }).join('');
}

// Nawigacja między miesiącami
$('#calPrev')?.addEventListener('click', () => {
    const c = getCalendarCursor();
    c.setMonth(c.getMonth() - 1);
    setCalendarCursor(c);
});
$('#calNext')?.addEventListener('click', () => {
    const c = getCalendarCursor();
    c.setMonth(c.getMonth() + 1);
    setCalendarCursor(c);
});
$('#calToday')?.addEventListener('click', () => {
    const d = new Date();
    setCalendarCursor(new Date(d.getFullYear(), d.getMonth(), 1));
});

// Szybkie dodanie zaplanowanego zadania
$('#openAddPlanned')?.addEventListener('click', () => {
    openTaskModal();
    $('#taskEnd').value = today();
});

/* =============================================================
   DZIŚ / JUTRO / POJUTRZE — karty na dashboardzie
   ============================================================= */
function renderThreeDays() {
    for (let i = 0; i < 3; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const iso = d.toISOString().slice(0, 10);

        $(`#dayDate${i}`).textContent = d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

        const dayTasks = tasksOnDate(iso);
        const container = $(`#dayTasks${i}`);
        if (dayTasks.length === 0) {
            container.innerHTML = '<div class="empty-mini">Brak zadań</div>';
            continue;
        }
        container.innerHTML = dayTasks.map(task => `
            <div class="day-task-item ${task.status === 'done' ? 'done' : ''}" onclick="toggleTask('${task.id}')">
                <div class="day-task-check ${task.status === 'done' ? 'checked' : ''}">${task.status === 'done' ? '✓' : ''}</div>
                <span>${escapeHTML(task.title)}</span>
            </div>
        `).join('');
    }
}

/* =============================================================
   PWA — INSTALACJA + POWIADOMIENIA
   ============================================================= */
let deferredPrompt = null;

// Chrome / Edge / Samsung Internet emitują ten event gdy app spełnia kryteria PWA
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $('#installBtn').classList.remove('hidden');
});

$('#installBtn')?.addEventListener('click', async () => {
    if (!deferredPrompt) {
        toast('📲 Instalacja', 'Użyj menu przeglądarki: "Zainstaluj aplikację"', 'warning');
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        toast('🎉 Zainstalowano!', 'MBG działa teraz jak natywna aplikacja', 'success');
        $('#installBtn').classList.add('hidden');
    }
    deferredPrompt = null;
});

// Po instalacji schowaj przycisk
window.addEventListener('appinstalled', () => {
    $('#installBtn')?.classList.add('hidden');
    toast('✅ Zainstalowano', 'Uruchom MBG z ekranu głównego', 'success');
});

// Zaplanuj powiadomienia hydration na pozostałe sloty dnia
function scheduleHydrationReminders() {
    if (!state.settings.notifications || !('serviceWorker' in navigator)) return;
    if (!navigator.serviceWorker.controller) return;

    const now = new Date();
    const slots = getTodayHydration();
    HYDRATION_SLOTS.forEach((slot, i) => {
        if (slots[i]) return; // już zaznaczone
        const [h, m] = slot.time.split(':').map(Number);
        const when = new Date();
        when.setHours(h, m, 0, 0);
        const delay = when - now;
        if (delay > 0 && delay < 24 * 3600 * 1000) {
            navigator.serviceWorker.controller.postMessage({
                type: 'schedule-reminder',
                title: `${slot.emoji} ${slot.label}`,
                body: `Czas na szklankę wody (${slot.time})`,
                delay
            });
        }
    });
}

// Wystaw globalnie dla inline onclick
window.toggleHabitDay = toggleHabitDay;
window.deleteHabit = deleteHabit;
window.editHabit = editHabit;
window.toggleHabitHistory = toggleHabitHistory;
window.toggleHydrationSlot = toggleHydrationSlot;
window.showDayDetail = showDayDetail;

/* =============================================================
   INICJALIZACJA
   ============================================================= */
function init() {
    // Wczytaj ustawienia do UI
    $('#dailyGoalInput').value = state.settings.dailyGoal;
    $('#notifToggle').checked = !!state.settings.notifications;

    // Wznów timer, jeśli był aktywny
    if (state.timer.running && state.timer.startedAt) {
        $('#timerStart').classList.add('hidden');
        $('#timerStop').classList.remove('hidden');
        timerInterval = setInterval(tickTimer, 200);
        const msg = state.timer.pomodoroTarget
            ? `🍅 Pomodoro wciąż trwa (${Math.floor(state.timer.pomodoroTarget / 60)} min)`
            : 'Sesja wciąż trwa';
        toast('⏱️ Timer wznowiony', msg, '');
    }
    // Pokaż pigułkę topbar od razu jeśli pomodoro aktywne
    renderPomodoroUI();

    seedDefaultHabits();
    buildJournalLangFields();
    renderHeader();
    renderDashboard();
    renderTimerTaskSelect();
    checkAchievements();

    // Wymuś załadowanie głosów TTS — niektóre przeglądarki ładują lazy
    if ('speechSynthesis' in window) {
        speechSynthesis.getVoices();
        speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    }

    // Po włączonych powiadomieniach — zaplanuj przypomnienia hydration
    if (state.settings.notifications) scheduleHydrationReminders();

    // Obsługa deeplinków z PWA shortcuts (#timer, #tasks, #journal)
    if (location.hash) {
        const v = location.hash.slice(1);
        if (['dashboard', 'tasks', 'timer', 'journal', 'stats', 'habits', 'calendar', 'achievements', 'challenges', 'settings'].includes(v)) {
            switchView(v);
        }
    }

    // Odśwież stan streaka — jeśli minął dzień bez akcji, wyzeruj
    const last = state.gamification.lastActiveDate;
    if (last) {
        const diff = Math.floor((new Date(today()) - new Date(last)) / 86400000);
        if (diff > 1) {
            state.gamification.streak = 0;
            saveState();
            renderHeader();
        }
    }
}

// Wystaw funkcje używane w onclick do scope'u globalnego
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;

init();
