/* =============================================================
   MÓWIĄCY ZEGAR — moduł zintegrowany z MBG
   - Zegar mówiący (PL/EN, 12h/24h, auto-zapowiedź co N minut)
   - Minutnik z głosem (zostało N minut/sekund, koniec czasu)
   - Alarmy z własnymi frazami (per dzień, PL lub EN)
   IIFE — własny scope, by nie zderzać się ze script.js
   ============================================================= */
(() => {
    if (!document.getElementById('view-clock')) return;

    /* ========== I18N ========== */
    const T = {
        pl: {
            timeNow: 'Aktualny czas',
            howToSay: 'Jak to powiedzieć',
            voice: 'Głos lektora',
            format: 'Format godziny',
            interval: 'Zapowiedź głosowa',
            speakNow: 'Powtórz teraz',
            wakeOff: 'Nie pozwól zasnąć',
            wakeOn: 'Ekran nie zaśnie',
            timerReady: 'Gotowy do startu',
            timerRunning: 'Odliczanie…',
            timerPaused: 'Wstrzymane',
            timerDone: 'Koniec czasu!',
            customLabel: 'Lub ustaw',
            customUnit: 'minut',
            btnStart: 'Start',
            btnPause: 'Pauza',
            btnResume: 'Wznów',
            yourAlarms: 'Twoje alarmy',
            addAlarm: 'Dodaj alarm',
            newAlarm: 'Nowy alarm',
            editAlarm: 'Edytuj alarm',
            formTime: 'Godzina',
            formPhrase: 'Fraza',
            formDays: 'Dni',
            formLang: 'Język frazy',
            qAll: 'Codziennie',
            qWeek: 'Dni powszednie',
            qWeekend: 'Weekend',
            qNone: 'Wyczyść',
            phPlaceholder: 'np. Dzień dobry, pora wstawać',
            intervals: { 0: 'Wyłączona', 1: 'Co minutę', 5: 'Co 5 minut', 10: 'Co 10 minut', 15: 'Co kwadrans', 30: 'Co pół godziny', 60: 'Co godzinę' },
            days: ['Pn','Wt','Śr','Cz','Pt','Sb','Nd'],
            noAlarms: 'Brak alarmów. Dodaj pierwszy — o danej godzinie zegar wypowie Twoją frazę.',
            announceOff: '· Auto-zapowiedź wyłączona',
            nextAt: (hh, mm, cd) => `· Następna zapowiedź o ${hh}:${mm} (za ${cd})`,
            alarmStatus: (n, t) => ` · ${n} z ${t} ${plForm(t, ['aktywny','aktywne','aktywnych'])}`,
            minutesLeft: (n) => {
                if (n === 1) return 'została jedna minuta';
                const f = plForm(n, ['minuta','minuty','minut']);
                return (f === 'minuty' ? 'zostały' : 'zostało') + ' ' + n + ' ' + f;
            },
            secondsLeft: (n) => {
                if (n === 1) return 'została jedna sekunda';
                const f = plForm(n, ['sekunda','sekundy','sekund']);
                return (f === 'sekundy' ? 'zostały' : 'zostało') + ' ' + n + ' ' + f;
            },
            timesUp: 'Koniec czasu!',
        },
        en: {
            timeNow: 'Current time', howToSay: 'How to say it',
            voice: 'Voice', format: 'Hour format', interval: 'Voice announcement',
            speakNow: 'Speak now',
            wakeOff: "Don't let screen sleep", wakeOn: 'Screen stays awake',
            timerReady: 'Ready', timerRunning: 'Running…', timerPaused: 'Paused', timerDone: "Time's up!",
            customLabel: 'Or set', customUnit: 'minutes',
            btnStart: 'Start', btnPause: 'Pause', btnResume: 'Resume',
            yourAlarms: 'Your alarms', addAlarm: 'Add alarm',
            newAlarm: 'New alarm', editAlarm: 'Edit alarm',
            formTime: 'Time', formPhrase: 'Phrase', formDays: 'Days', formLang: 'Phrase language',
            qAll: 'Every day', qWeek: 'Weekdays', qWeekend: 'Weekend', qNone: 'Clear',
            phPlaceholder: 'e.g. Good morning, time to wake up',
            intervals: { 0: 'Off', 1: 'Every minute', 5: 'Every 5 min', 10: 'Every 10 min', 15: 'Every quarter', 30: 'Every half hour', 60: 'Every hour' },
            days: ['Mo','Tu','We','Th','Fr','Sa','Su'],
            noAlarms: 'No alarms yet. Add one — at a given time the clock will speak your phrase.',
            announceOff: '· Auto-announcement off',
            nextAt: (hh, mm, cd) => `· Next announcement at ${hh}:${mm} (in ${cd})`,
            alarmStatus: (n, t) => ` · ${n} of ${t} active`,
            minutesLeft: (n) => n === 1 ? 'one minute left' : `${n} minutes left`,
            secondsLeft: (n) => n === 1 ? 'one second left' : `${n} seconds left`,
            timesUp: "Time's up!",
        }
    };

    function plForm(n, forms) {
        if (n === 1) return forms[0];
        const lt = n % 100, l = n % 10;
        if (l >= 2 && l <= 4 && (lt < 12 || lt > 14)) return forms[1];
        return forms[2];
    }

    /* ========== STATE (osobny localStorage od głównej apki) ========== */
    const SK = 'mbg_clock_v1';
    const DEFAULTS = {
        language: 'pl',
        hourMode: '12',
        announceInterval: 15,
        voicePL: null,
        voiceEN: null,
        alarms: [],
        timerMinutes: 5,
    };
    let st = { ...DEFAULTS };

    try {
        const raw = localStorage.getItem(SK);
        if (raw) st = { ...DEFAULTS, ...JSON.parse(raw) };
        if (!Array.isArray(st.alarms)) st.alarms = [];
    } catch (e) {}

    const save = () => { try { localStorage.setItem(SK, JSON.stringify(st)); } catch (e) {} };
    const tr = (k) => T[st.language][k] !== undefined ? T[st.language][k] : T.pl[k];

    /* ========== POLISH TIME PHRASE ========== */
    const ORD12_PL = ['pierwsza','druga','trzecia','czwarta','piąta','szósta','siódma','ósma','dziewiąta','dziesiąta','jedenasta','dwunasta'];
    const ORD24_PL = [...ORD12_PL,'trzynasta','czternasta','piętnasta','szesnasta','siedemnasta','osiemnasta','dziewiętnasta','dwudziesta','dwudziesta pierwsza','dwudziesta druga','dwudziesta trzecia'];
    const ONES_PL = ['zero','jeden','dwa','trzy','cztery','pięć','sześć','siedem','osiem','dziewięć','dziesięć','jedenaście','dwanaście','trzynaście','czternaście','piętnaście','szesnaście','siedemnaście','osiemnaście','dziewiętnaście'];
    const TENS_PL = ['','','dwadzieścia','trzydzieści','czterdzieści','pięćdziesiąt'];

    const cardinalPL = (n) => {
        if (n < 20) return ONES_PL[n];
        const d = Math.floor(n / 10), j = n % 10;
        return j === 0 ? TENS_PL[d] : TENS_PL[d] + ' ' + ONES_PL[j];
    };
    const hourOrdPL = (h, m) => {
        if (m === '24') return h === 0 ? 'dwudziesta czwarta' : (ORD24_PL[h - 1] || ORD24_PL[0]);
        let h12 = h % 12; if (h12 === 0) h12 = 12;
        return ORD12_PL[h12 - 1];
    };
    const polishTime = (h, m, mode) => {
        const hp = 'godzina ' + hourOrdPL(h, mode);
        return m === 0 ? hp : hp + ' ' + cardinalPL(m);
    };

    /* ========== ENGLISH TIME PHRASE ========== */
    const HOUR_EN = ['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];
    const NUM_EN = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight','twenty-nine'];

    const englishTime = (h, m) => {
        let h12 = h % 12; if (h12 === 0) h12 = 12;
        let nx = (h + 1) % 12; if (nx === 0) nx = 12;
        const hw = HOUR_EN[h12 - 1], nxw = HOUR_EN[nx - 1];
        if (m === 0) return `it's ${hw} o'clock`;
        if (m === 15) return `it's a quarter past ${hw}`;
        if (m === 30) return `it's half past ${hw}`;
        if (m === 45) return `it's a quarter to ${nxw}`;
        if (m < 30) {
            const w = NUM_EN[m], s = (m % 5 === 0) ? '' : ' minutes';
            return `it's ${w}${s} past ${hw}`;
        }
        const d = 60 - m, w = NUM_EN[d], s = (d % 5 === 0) ? '' : ' minutes';
        return `it's ${w}${s} to ${nxw}`;
    };

    const buildPhrase = (h, m, mode) => st.language === 'en' ? englishTime(h, m) : polishTime(h, m, mode);

    /* ========== DOM REFS ========== */
    const $ = (id) => document.getElementById(id);
    const refs = {
        hh: $('clkHH'), mm: $('clkMM'), ss: $('clkSS'),
        period: $('clkPeriod'), progress: $('clkProgress'),
        phrase: $('clkPhrase'), nextInfo: $('clkNextInfo'),
        speaker: $('clkSpeaker'),
        voice: $('clkVoice'), interval: $('clkInterval'),
        hourSeg: $('clkHourModeSeg'), langSeg: $('clkLangSeg'),
        speakBtn: $('clkSpeakBtn'), wakeBtn: $('clkWakeBtn'),
        speakLbl: $('clkSpeakLbl'), wakeLbl: $('clkWakeLbl'),
        labelTime: $('clkLabelTime'), labelHowToSay: $('clkLabelHowToSay'),
        labelVoice: $('clkLabelVoice'), labelFormat: $('clkLabelFormat'), labelInterval: $('clkLabelInterval'),
        handHour: $('clkHandHour'), handMin: $('clkHandMin'), handSec: $('clkHandSec'),
        analogMarks: $('clkAnalogMarks'), analogNums: $('clkAnalogNums'),

        // Timer
        tDisplay: $('clkTimerDisplay'), tProgress: $('clkTimerProgress'),
        tLabel: $('clkTimerLabel'), tPresets: $('clkTimerPresets'),
        tInput: $('clkTimerInput'), tStart: $('clkTimerStart'), tReset: $('clkTimerReset'),
        tStartLbl: $('clkTimerStartLbl'),
        customLbl: $('clkCustomLbl'), customUnit: $('clkCustomUnit'),

        // Alarms
        aList: $('clkAlarmsList'), aCount: $('clkAlarmsCount'),
        aStatus: $('clkAlarmsStatus'), aTitle: $('clkAlarmsTitle'),
        aAddBtn: $('clkAddAlarmBtn'), aAddLbl: $('clkAddAlarmLbl'),
        aForm: $('clkAlarmForm'), aFormTitle: $('clkAlarmFormTitle'),
        aTime: $('clkAlarmTime'), aText: $('clkAlarmText'),
        aDays: $('clkDayChips'), aLangSeg: $('clkAlarmLangSeg'),
        aCancel: $('clkAlarmCancel'), aSave: $('clkAlarmSave'),
        formTimeLbl: $('clkFormTimeLbl'), formPhraseLbl: $('clkFormPhraseLbl'),
        formDaysLbl: $('clkFormDaysLbl'), formLangLbl: $('clkFormLangLbl'),
        qAll: $('clkQuickAll'), qWeek: $('clkQuickWeek'),
        qWeekend: $('clkQuickWeekend'), qNone: $('clkQuickNone'),

        // Firing
        firing: $('clkFiring'), firingTime: $('clkFiringTime'),
        firingText: $('clkFiringText'), firingDismiss: $('clkFiringDismiss'),
    };

    /* ========== ANALOG CLOCK BUILD ========== */
    (() => {
        const m = refs.analogMarks, n = refs.analogNums;
        for (let i = 0; i < 60; i++) {
            const angle = (i * 6) * Math.PI / 180;
            const isHour = i % 5 === 0;
            const r1 = 95, r2 = isHour ? 85 : 90;
            const x1 = 100 + r1 * Math.sin(angle), y1 = 100 - r1 * Math.cos(angle);
            const x2 = 100 + r2 * Math.sin(angle), y2 = 100 - r2 * Math.cos(angle);
            const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            ln.setAttribute('x1', x1); ln.setAttribute('y1', y1);
            ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
            ln.setAttribute('class', isHour ? 'mark mark-major' : 'mark mark-minor');
            m.appendChild(ln);
        }
        [[12,0,-70],[3,70,0],[6,0,70],[9,-70,0]].forEach(([num,dx,dy]) => {
            const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', 100 + dx); t.setAttribute('y', 100 + dy);
            t.setAttribute('class', 'num');
            t.textContent = num;
            n.appendChild(t);
        });
    })();

    /* ========== VOICES ========== */
    let voices = [], voicePL = null, voiceEN = null;

    const pickVoice = (list, lang) => {
        if (lang === 'pl') {
            const pl = list.filter(v => /^pl/i.test(v.lang) || /polish|zosia|paulina|ewa|agnieszka|krzysztof/i.test(v.name));
            if (!pl.length) return null;
            const order = [/google.*polish/i, /microsoft.*(zofia|paulina|agnieszka)/i, /natural|neural|online/i, /pl-PL/i, /./];
            for (const p of order) { const h = pl.find(v => p.test(v.name) || p.test(v.lang)); if (h) return h; }
            return pl[0];
        }
        const en = list.filter(v => /^en/i.test(v.lang));
        if (!en.length) return null;
        const order = [/google.*uk|google.*british/i, /microsoft.*(libby|sonia|ryan)/i, /en-GB/i, /natural|neural|online/i, /en-US/i, /./];
        for (const p of order) { const h = en.find(v => p.test(v.name) || p.test(v.lang)); if (h) return h; }
        return en[0];
    };

    const loadVoices = () => {
        voices = speechSynthesis.getVoices();
        refs.voice.innerHTML = '';
        const isPL = st.language === 'pl';
        const primary = voices.filter(v => isPL ? /^pl/i.test(v.lang) : /^en/i.test(v.lang));
        const others = voices.filter(v => !(isPL ? /^pl/i.test(v.lang) : /^en/i.test(v.lang)));

        if (primary.length) {
            const g = document.createElement('optgroup');
            g.label = isPL ? 'Polskie głosy' : 'English voices';
            primary.forEach(v => {
                const o = document.createElement('option');
                o.value = v.name; o.textContent = `${v.name} — ${v.lang}`;
                g.appendChild(o);
            });
            refs.voice.appendChild(g);
        }
        if (others.length) {
            const g = document.createElement('optgroup');
            g.label = isPL ? 'Pozostałe' : 'Other languages';
            others.slice(0, 30).forEach(v => {
                const o = document.createElement('option');
                o.value = v.name; o.textContent = `${v.name} — ${v.lang}`;
                g.appendChild(o);
            });
            refs.voice.appendChild(g);
        }

        const storedKey = isPL ? 'voicePL' : 'voiceEN';
        const stored = st[storedKey];
        const found = stored && voices.find(v => v.name === stored);
        const best = found || pickVoice(voices, st.language);
        if (best) {
            if (isPL) voicePL = best; else voiceEN = best;
            refs.voice.value = best.name;
        }
        // Cicho dobierz głos dla drugiego języka
        const otherLang = isPL ? 'en' : 'pl';
        const otherStored = isPL ? st.voiceEN : st.voicePL;
        const otherFound = otherStored && voices.find(v => v.name === otherStored);
        const otherBest = otherFound || pickVoice(voices, otherLang);
        if (otherBest) { if (otherLang === 'pl') voicePL = otherBest; else voiceEN = otherBest; }
    };

    refs.voice.addEventListener('change', () => {
        const v = voices.find(vv => vv.name === refs.voice.value);
        if (!v) return;
        if (st.language === 'pl') { voicePL = v; st.voicePL = v.name; }
        else { voiceEN = v; st.voiceEN = v.name; }
        save();
    });

    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = loadVoices;

    /* ========== SPEAK ========== */
    const speak = (text, lang = st.language, { highlight = false } = {}) => {
        if (!('speechSynthesis' in window)) return;
        try { speechSynthesis.cancel(); } catch (e) {}
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang === 'en' ? 'en-GB' : 'pl-PL';
        const v = lang === 'en' ? voiceEN : voicePL;
        if (v) u.voice = v;
        u.rate = 0.95; u.pitch = 1.0; u.volume = 1.0;

        u.onstart = () => refs.speaker.classList.add('on');
        u.onend = u.onerror = () => refs.speaker.classList.remove('on');

        if (highlight) {
            const words = refs.phrase.querySelectorAll('.w');
            let idx = 0;
            words.forEach(w => w.classList.remove('active', 'spoken'));
            u.onboundary = (e) => {
                if (e.name !== 'word') return;
                if (idx > 0) words[idx - 1]?.classList.add('spoken');
                words[idx - 1]?.classList.remove('active');
                words[idx]?.classList.add('active');
                idx++;
            };
            u.onend = () => {
                refs.speaker.classList.remove('on');
                words.forEach(w => { w.classList.remove('active'); w.classList.add('spoken'); });
            };
        }
        speechSynthesis.speak(u);
    };

    /* ========== AUDIO DING (Web Audio API) ========== */
    let audioCtx = null;
    const ding = (freq = 880, dur = 0.5) => {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq / 2, audioCtx.currentTime + dur);
            gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur + 0.2);
            osc.start();
            osc.stop(audioCtx.currentTime + dur + 0.3);
        } catch (e) {}
    };

    /* ========== RENDER ZEGARA ========== */
    const pad = (n) => String(n).padStart(2, '0');

    const renderPhrase = (h, m) => {
        const text = buildPhrase(h, m, st.hourMode);
        refs.phrase.innerHTML = '';
        const tokens = text.split(' ');
        tokens.forEach((w, i) => {
            const sp = document.createElement('span');
            sp.className = 'w';
            sp.textContent = w;
            refs.phrase.appendChild(sp);
            if (i < tokens.length - 1) refs.phrase.appendChild(document.createTextNode(' '));
        });
    };

    let lastMinute = -1;
    let lastAlarmCheck = -1;

    const updateNextInfo = (h, m, s) => {
        if (st.announceInterval === 0) {
            refs.nextInfo.textContent = tr('announceOff');
            return;
        }
        const rem = m % st.announceInterval;
        const minsToNext = rem === 0 ? st.announceInterval : st.announceInterval - rem;
        const secsTo = minsToNext * 60 - s;
        const mm = Math.floor(secsTo / 60), ss = secsTo % 60;
        const target = new Date();
        target.setSeconds(0, 0);
        target.setMinutes(target.getMinutes() + minsToNext);
        const cd = mm > 0 ? `${mm} min ${pad(ss)} s` : `${ss} s`;
        refs.nextInfo.textContent = tr('nextAt')(pad(target.getHours()), pad(target.getMinutes()), cd);
    };

    const updateDigital = () => {
        const now = new Date();
        const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();

        let dh = h;
        if (st.hourMode === '12') {
            dh = h % 12 || 12;
            refs.period.textContent = h < 12 ? 'AM' : 'PM';
            refs.period.style.display = '';
        } else {
            refs.period.style.display = 'none';
        }

        refs.hh.textContent = pad(dh);
        refs.mm.textContent = pad(m);
        refs.ss.textContent = pad(s);
        refs.progress.style.setProperty('--pct', `${(s / 60) * 100}%`);

        if (m !== lastMinute || refs.phrase.children.length === 0) {
            renderPhrase(h, m);
            // Auto-zapowiedź na granicy minuty — POMIŃ jeśli dziennik czyta TTS
            if (m !== lastMinute && lastMinute !== -1) {
                if (st.announceInterval > 0 && m % st.announceInterval === 0) {
                    if (window.mbgTTSBusy) {
                        // Pauza: zegar nie przerywa odczytu dziennika
                        console.log('[clock] auto-announce skipped — journal TTS active');
                    } else {
                        speak(buildPhrase(h, m, st.hourMode));
                    }
                }
            }
            lastMinute = m;
        }

        // Alarm check raz na minutę
        const minuteKey = h * 60 + m;
        if (minuteKey !== lastAlarmCheck) {
            checkAlarms(h, m, now);
            lastAlarmCheck = minuteKey;
        }

        updateNextInfo(h, m, s);
    };

    const updateAnalog = () => {
        const now = new Date();
        const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds(), ms = now.getMilliseconds();
        refs.handHour.style.transform = `rotate(${((h % 12) + m / 60) * 30}deg)`;
        refs.handMin.style.transform = `rotate(${(m + s / 60) * 6}deg)`;
        refs.handSec.style.transform = `rotate(${(s + ms / 1000) * 6}deg)`;
        requestAnimationFrame(updateAnalog);
    };

    /* ========== KONTROLKI ZEGARA ========== */
    refs.hourSeg.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', () => {
            refs.hourSeg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
            b.classList.add('on');
            st.hourMode = b.dataset.mode;
            save();
            const now = new Date();
            renderPhrase(now.getHours(), now.getMinutes());
            updateDigital();
        });
    });

    refs.interval.addEventListener('change', () => {
        st.announceInterval = parseInt(refs.interval.value, 10) || 0;
        save();
        const now = new Date();
        updateNextInfo(now.getHours(), now.getMinutes(), now.getSeconds());
    });

    refs.speakBtn.addEventListener('click', () => {
        if (window.mbgTTSBusy) {
            alert('🔊 Dziennik aktualnie odczytuje wpis. Zatrzymaj odczyt, aby usłyszeć godzinę.');
            return;
        }
        const now = new Date();
        renderPhrase(now.getHours(), now.getMinutes());
        speak(buildPhrase(now.getHours(), now.getMinutes(), st.hourMode), st.language, { highlight: true });
    });

    /* ========== JĘZYK ========== */
    refs.langSeg.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', () => {
            refs.langSeg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
            b.classList.add('on');
            st.language = b.dataset.lang;
            save();
            applyTranslations();
            loadVoices();
            const now = new Date();
            renderPhrase(now.getHours(), now.getMinutes());
            renderAlarms();
            renderDayChips();
        });
    });

    const applyTranslations = () => {
        refs.labelTime.textContent = tr('timeNow');
        refs.labelHowToSay.textContent = tr('howToSay');
        refs.labelVoice.textContent = tr('voice');
        refs.labelFormat.textContent = tr('format');
        refs.labelInterval.textContent = tr('interval');
        refs.speakLbl.textContent = tr('speakNow');
        refs.wakeLbl.textContent = wakeWanted ? tr('wakeOn') : tr('wakeOff');
        refs.tStartLbl.textContent =
            timer.state === 'running' ? tr('btnPause') :
            timer.state === 'paused' ? tr('btnResume') : tr('btnStart');
        refs.customLbl.textContent = tr('customLabel');
        refs.customUnit.textContent = tr('customUnit');
        refs.aTitle.firstChild.textContent = tr('yourAlarms') + ' ';
        refs.aAddLbl.textContent = tr('addAlarm');
        refs.aFormTitle.textContent = editingAlarmId ? tr('editAlarm') : tr('newAlarm');
        refs.formTimeLbl.textContent = tr('formTime');
        refs.formPhraseLbl.textContent = tr('formPhrase');
        refs.formDaysLbl.textContent = tr('formDays');
        refs.formLangLbl.textContent = tr('formLang');
        refs.qAll.textContent = tr('qAll');
        refs.qWeek.textContent = tr('qWeek');
        refs.qWeekend.textContent = tr('qWeekend');
        refs.qNone.textContent = tr('qNone');
        refs.aText.placeholder = tr('phPlaceholder');
        refs.aCancel.textContent = st.language === 'pl' ? 'Anuluj' : 'Cancel';
        refs.aSave.textContent = st.language === 'pl' ? 'Zapisz alarm' : 'Save alarm';
        refs.firingDismiss.textContent = (st.language === 'pl' ? '✖ Wyłącz alarm' : '✖ Dismiss');
        const labels = T[st.language].intervals;
        Array.from(refs.interval.options).forEach(o => {
            if (labels[o.value] !== undefined) o.textContent = labels[o.value];
        });
    };

    /* ========== SUBTABS ========== */
    document.querySelectorAll('.clock-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.clock-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.clock-tab-pane').forEach(p => p.classList.remove('active'));
            document.getElementById('clkTab-' + tab.dataset.clockTab).classList.add('active');
        });
    });

    /* ========== MINUTNIK ========== */
    let timer = {
        state: 'idle',     // idle | running | paused | done
        totalSeconds: 300,
        remaining: 300,
        endTime: 0,
        lastAnnounced: -1,
        raf: 0,
    };

    const setTimerDuration = (mins) => {
        timer.totalSeconds = mins * 60;
        timer.remaining = mins * 60;
        timer.state = 'idle';
        st.timerMinutes = mins;
        save();
        renderTimer();
    };

    const renderTimer = () => {
        const s = Math.max(0, timer.remaining);
        const mm = Math.floor(s / 60), ss = s % 60;
        refs.tDisplay.textContent = `${pad(mm)}:${pad(ss)}`;
        const pct = timer.totalSeconds > 0 ? ((timer.totalSeconds - s) / timer.totalSeconds) * 100 : 0;
        refs.tProgress.style.setProperty('--pct', `${pct}%`);

        refs.tDisplay.classList.toggle('running', timer.state === 'running');
        refs.tDisplay.classList.toggle('finished', timer.state === 'done');

        const labels = {
            idle: tr('timerReady'), running: tr('timerRunning'),
            paused: tr('timerPaused'), done: tr('timerDone')
        };
        refs.tLabel.textContent = labels[timer.state];

        const span = refs.tStartLbl;
        if (timer.state === 'running') span.textContent = tr('btnPause');
        else if (timer.state === 'paused') span.textContent = tr('btnResume');
        else span.textContent = tr('btnStart');
    };

    const timerTick = () => {
        if (timer.state !== 'running') return;
        timer.remaining = Math.max(0, Math.ceil((timer.endTime - Date.now()) / 1000));
        const r = timer.remaining;

        if (r !== timer.lastAnnounced) {
            timer.lastAnnounced = r;
            if (r === 0) {
                timer.state = 'done';
                ding(880, 0.4);
                setTimeout(() => ding(660, 0.6), 300);
                setTimeout(() => speak(tr('timesUp')), 900);
            } else if (r % 60 === 0 && r <= timer.totalSeconds - 60) {
                speak(T[st.language].minutesLeft(r / 60));
            } else if (r === 30 || r === 10) {
                speak(T[st.language].secondsLeft(r));
                if (r === 10) ding(660, 0.15);
            } else if (r >= 1 && r <= 5) {
                ding(660, 0.1);
            }
        }
        renderTimer();
        if (timer.state === 'running') timer.raf = requestAnimationFrame(timerTick);
    };

    refs.tPresets.querySelectorAll('.timer-preset').forEach(b => {
        b.addEventListener('click', () => {
            refs.tPresets.querySelectorAll('.timer-preset').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            const m = parseInt(b.dataset.mins, 10);
            refs.tInput.value = m;
            setTimerDuration(m);
        });
    });

    refs.tInput.addEventListener('input', () => {
        const m = Math.max(1, Math.min(180, parseInt(refs.tInput.value, 10) || 1));
        refs.tPresets.querySelectorAll('.timer-preset').forEach(x => {
            x.classList.toggle('active', parseInt(x.dataset.mins, 10) === m);
        });
        setTimerDuration(m);
    });

    refs.tStart.addEventListener('click', () => {
        if (timer.state === 'running') {
            timer.state = 'paused';
            timer.remaining = Math.max(0, Math.ceil((timer.endTime - Date.now()) / 1000));
            cancelAnimationFrame(timer.raf);
        } else if (timer.state === 'paused') {
            timer.state = 'running';
            timer.endTime = Date.now() + timer.remaining * 1000;
            timer.lastAnnounced = -1;
            timer.raf = requestAnimationFrame(timerTick);
        } else {
            if (timer.state === 'done') timer.remaining = timer.totalSeconds;
            timer.state = 'running';
            timer.endTime = Date.now() + timer.remaining * 1000;
            timer.lastAnnounced = -1;
            timer.raf = requestAnimationFrame(timerTick);
        }
        renderTimer();
    });

    refs.tReset.addEventListener('click', () => {
        timer.state = 'idle';
        timer.remaining = timer.totalSeconds;
        cancelAnimationFrame(timer.raf);
        try { speechSynthesis.cancel(); } catch (e) {}
        renderTimer();
    });

    /* ========== ALARMY ========== */
    const dowMondayFirst = (jsDay) => (jsDay + 6) % 7;
    const newId = () => 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    let editingAlarmId = null;
    let formDays = [true, true, true, true, true, false, false];
    let formLang = 'pl';

    const renderDayChips = () => {
        refs.aDays.innerHTML = '';
        T[st.language].days.forEach((lab, i) => {
            const b = document.createElement('button');
            b.className = 'day-chip' + (formDays[i] ? ' on' : '');
            b.textContent = lab;
            b.dataset.idx = i;
            b.addEventListener('click', () => {
                formDays[i] = !formDays[i];
                b.classList.toggle('on');
            });
            refs.aDays.appendChild(b);
        });
    };

    const openAlarmForm = (alarm = null) => {
        editingAlarmId = alarm ? alarm.id : null;
        refs.aFormTitle.textContent = alarm ? tr('editAlarm') : tr('newAlarm');
        if (alarm) {
            refs.aTime.value = alarm.time;
            refs.aText.value = alarm.text;
            formDays = [...alarm.days];
            formLang = alarm.language;
        } else {
            refs.aTime.value = '07:30';
            refs.aText.value = '';
            formDays = [true, true, true, true, true, false, false];
            formLang = st.language;
        }
        refs.aLangSeg.querySelectorAll('button').forEach(b => {
            b.classList.toggle('on', b.dataset.lang === formLang);
        });
        renderDayChips();
        refs.aForm.classList.add('open');
        refs.aForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => refs.aText.focus(), 100);
    };

    const closeAlarmForm = () => {
        refs.aForm.classList.remove('open');
        editingAlarmId = null;
    };

    refs.aAddBtn.addEventListener('click', () => openAlarmForm());
    refs.aCancel.addEventListener('click', closeAlarmForm);

    refs.aLangSeg.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', () => {
            refs.aLangSeg.querySelectorAll('button').forEach(x => x.classList.remove('on'));
            b.classList.add('on');
            formLang = b.dataset.lang;
        });
    });

    [refs.qAll, refs.qWeek, refs.qWeekend, refs.qNone].forEach(b => {
        b.addEventListener('click', () => {
            const q = b.dataset.quick;
            if (q === 'all') formDays = [true,true,true,true,true,true,true];
            else if (q === 'week') formDays = [true,true,true,true,true,false,false];
            else if (q === 'weekend') formDays = [false,false,false,false,false,true,true];
            else formDays = [false,false,false,false,false,false,false];
            renderDayChips();
        });
    });

    refs.aSave.addEventListener('click', () => {
        const text = refs.aText.value.trim();
        const time = refs.aTime.value;
        if (!text) { refs.aText.focus(); return; }
        if (!time || !/^\d{2}:\d{2}$/.test(time)) { refs.aTime.focus(); return; }
        if (!formDays.some(Boolean)) formDays = [true,true,true,true,true,true,true];

        const alarm = {
            id: editingAlarmId || newId(),
            time, text,
            days: [...formDays],
            language: formLang,
            enabled: true,
        };
        if (editingAlarmId) {
            const idx = st.alarms.findIndex(a => a.id === editingAlarmId);
            if (idx >= 0) { alarm.enabled = st.alarms[idx].enabled; st.alarms[idx] = alarm; }
        } else {
            st.alarms.push(alarm);
        }
        st.alarms.sort((a, b) => a.time.localeCompare(b.time));
        save();
        renderAlarms();
        closeAlarmForm();
    });

    const escapeHtml = (s) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    const renderAlarms = () => {
        refs.aList.innerHTML = '';
        const total = st.alarms.length;
        const active = st.alarms.filter(a => a.enabled).length;
        refs.aCount.textContent = total;
        refs.aStatus.textContent = total === 0 ? '' : T[st.language].alarmStatus(active, total);

        if (total === 0) {
            const d = document.createElement('div');
            d.className = 'empty-state';
            d.textContent = tr('noAlarms');
            refs.aList.appendChild(d);
            return;
        }

        st.alarms.forEach(a => {
            const card = document.createElement('div');
            card.className = 'alarm-card' + (a.enabled ? ' enabled' : '');
            const labels = T[st.language].days;
            const daysHTML = labels.map((lab, i) =>
                `<span class="day-pill${a.days[i] ? ' on' : ''}">${lab}</span>`
            ).join('');
            card.innerHTML = `
                <div class="alarm-time">${a.time}</div>
                <div>
                    <div class="alarm-text">${escapeHtml(a.text)}<span class="lang-pill">${a.language}</span></div>
                    <div class="alarm-days">${daysHTML}</div>
                </div>
                <div class="alarm-actions">
                    <div class="switch${a.enabled ? ' on' : ''}" data-id="${a.id}" data-act="toggle" role="switch"></div>
                    <button class="icon-btn" data-id="${a.id}" data-act="edit" title="Edytuj">✏️</button>
                    <button class="icon-btn delete" data-id="${a.id}" data-act="delete" title="Usuń">🗑️</button>
                </div>
            `;
            refs.aList.appendChild(card);
        });
    };

    refs.aList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const a = st.alarms.find(x => x.id === btn.dataset.id);
        if (!a) return;
        if (btn.dataset.act === 'toggle') {
            a.enabled = !a.enabled;
            save();
            renderAlarms();
        } else if (btn.dataset.act === 'edit') {
            openAlarmForm(a);
        } else if (btn.dataset.act === 'delete') {
            const msg = st.language === 'pl' ? `Usunąć alarm "${a.text}"?` : `Delete alarm "${a.text}"?`;
            if (confirm(msg)) {
                st.alarms = st.alarms.filter(x => x.id !== a.id);
                save();
                renderAlarms();
            }
        }
    });

    /* ========== FIRING ========== */
    let firingId = null;
    const fireAlarm = (a) => {
        firingId = a.id;
        refs.firingTime.textContent = a.time;
        refs.firingText.textContent = a.text;
        refs.firing.classList.add('on');
        ding(880, 0.3);
        setTimeout(() => ding(660, 0.5), 350);
        setTimeout(() => speak(a.text, a.language), 900);
    };

    refs.firingDismiss.addEventListener('click', () => {
        refs.firing.classList.remove('on');
        try { speechSynthesis.cancel(); } catch (e) {}
        firingId = null;
    });

    const checkAlarms = (h, m, now) => {
        const hhmm = pad(h) + ':' + pad(m);
        const dow = dowMondayFirst(now.getDay());
        for (const a of st.alarms) {
            if (!a.enabled) continue;
            if (a.time !== hhmm) continue;
            if (!a.days[dow]) continue;
            fireAlarm(a);
            return;
        }
    };

    /* ========== WAKE LOCK ========== */
    let wakeLock = null, wakeWanted = false;

    const requestWakeLock = async () => {
        if (!('wakeLock' in navigator)) {
            refs.wakeLbl.textContent = 'N/A';
            refs.wakeBtn.disabled = true;
            return false;
        }
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                if (wakeWanted && document.visibilityState === 'visible') requestWakeLock();
            });
            refs.wakeBtn.classList.add('pulse');
            refs.wakeLbl.textContent = tr('wakeOn');
            return true;
        } catch (err) { return false; }
    };

    const releaseWakeLock = async () => {
        if (wakeLock) { try { await wakeLock.release(); } catch (e) {} wakeLock = null; }
        refs.wakeBtn.classList.remove('pulse');
        refs.wakeLbl.textContent = tr('wakeOff');
    };

    refs.wakeBtn.addEventListener('click', async () => {
        wakeWanted = !wakeWanted;
        if (wakeWanted) await requestWakeLock();
        else await releaseWakeLock();
    });

    document.addEventListener('visibilitychange', () => {
        if (wakeWanted && document.visibilityState === 'visible' && !wakeLock) requestWakeLock();
    });

    /* ========== INIT ========== */
    refs.langSeg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.lang === st.language));
    refs.hourSeg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.mode === st.hourMode));
    refs.interval.value = String(st.announceInterval);
    refs.tInput.value = st.timerMinutes;
    refs.tPresets.querySelectorAll('.timer-preset').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.mins, 10) === st.timerMinutes);
    });
    setTimerDuration(st.timerMinutes);

    applyTranslations();
    if ('speechSynthesis' in window) loadVoices();
    renderAlarms();
    renderDayChips();

    // Bezpiecznik: nie uruchamiaj alarmu z aktualnej minuty po załadowaniu
    {
        const now = new Date();
        lastAlarmCheck = now.getHours() * 60 + now.getMinutes();
    }

    updateDigital();
    setInterval(updateDigital, 1000);
    requestAnimationFrame(updateAnalog);
})();
