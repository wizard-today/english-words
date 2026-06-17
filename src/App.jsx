import { useState, useEffect, useRef } from "react";
import { Api } from './api'

const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const LAST_CAT_KEY   = "fc_last_category_id";
const LAST_MODE_KEY  = "fc_last_mode";
const LAST_TRAIN_KEY = "fc_last_train_mode";
const LAST_TIMER_KEY = "fc_last_timer";

const TIMER_OPTIONS   = [1, 2, 3, 5, 10];
const LEARN_INTERVALS = TIMER_OPTIONS.toReversed();

function countAll(cat) {
  const own  = cat.cards_count ?? 0;
  const rOwn = cat.repeat_cards_count ?? 0;
  const nested = cat.nested ?? [];
  const childTotal  = nested.reduce((s, c) => s + countAll(c).total,  0);
  const childRepeat = nested.reduce((s, c) => s + countAll(c).repeat, 0);
  return { total: own + childTotal, repeat: rOwn + childRepeat };
}

function findCat(list, id) {
  if (!id) return null;
  for (const c of list) {
    if (c.id === id) return c;
    const f = findCat(c.nested ?? [], id);
    if (f) return f;
  }
  return null;
}

function nextRepeat(card, repeats) {
  const now = Date.now();
  if (!repeats.length) return { repeat_date_timestamp: now, repeat_after: null };
  if (!card.repeat_after) {
    const r = repeats[0];
    return { repeat_date_timestamp: now + r.timestamp * 1000, repeat_after: { id: r.id } };
  }
  const idx = repeats.findIndex(r => r.id === card.repeat_after.id);
  const next = idx === -1 || idx >= repeats.length - 1 ? repeats[repeats.length - 1] : repeats[idx + 1];
  return { repeat_date_timestamp: now + next.timestamp * 1000, repeat_after: { id: next.id } };
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap');

:root {
  --ink:        #0f0e0c;
  --ink2:       #4a443a;
  --ink3:       #9a9080;
  --paper:      #faf8f4;
  --card:       #ffffff;
  --rule:       rgba(15,14,12,0.09);
  --rule2:      rgba(15,14,12,0.16);
  --gold:       #b87a00;
  --gold-bg:    #fff8e6;
  --gold-rule:  rgba(184,122,0,0.3);
  --green:      #1a6b3c;
  --green-bg:   #eaf4ef;
  --green-rule: rgba(26,107,60,0.25);
  --red:        #c0392b;
  --red-bg:     #fdf0ef;
  --blue:       #1a5cb8;
  --blue-bg:    #eaf0fb;
  --blue-rule:  rgba(26,92,184,0.25);
  --r:          14px;
  --r-sm:       9px;
  --transition: 0.15s cubic-bezier(0.4,0,0.2,1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --ink:        #f0ece2;
    --ink2:       #a09580;
    --ink3:       #5a5248;
    --paper:      #141210;
    --card:       #1e1c18;
    --rule:       rgba(240,236,226,0.08);
    --rule2:      rgba(240,236,226,0.14);
    --gold:       #e0a830;
    --gold-bg:    #241c08;
    --gold-rule:  rgba(224,168,48,0.25);
    --green:      #3cc870;
    --green-bg:   #0a2016;
    --green-rule: rgba(60,200,112,0.2);
    --red:        #e05548;
    --red-bg:     #210c0a;
    --blue:       #5090e8;
    --blue-bg:    #0a1428;
    --blue-rule:  rgba(80,144,232,0.2);
  }
}

@keyframes fadeUp    { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
@keyframes popIn     { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }
@keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
@keyframes barShrink { from { transform:scaleX(1); } to { transform:scaleX(0); } }
@keyframes pulse     { 0%,100% { opacity:1; } 50% { opacity:0.5; } }

*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

body, .fc-root {
  font-family: 'DM Sans', system-ui, sans-serif;
  background: var(--paper);
  color: var(--ink);
  min-height: 100vh;
}
.fc-root { padding: 0 1rem 5rem; }

.surface {
  background: var(--card);
  border: 1px solid var(--rule);
  border-radius: var(--r);
}

button { font-family: inherit; cursor: pointer; border: none; background: none; }

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  font-size: 14px; font-weight: 500; padding: 11px 20px;
  border-radius: var(--r-sm);
  transition: opacity var(--transition), transform var(--transition);
  white-space: nowrap;
}
.btn:active { transform: scale(0.97); }
.btn-primary { background: var(--ink); color: var(--paper); }
.btn-primary:hover { opacity: 0.82; }
.btn-primary:disabled { background: var(--rule2); color: var(--ink3); cursor: not-allowed; transform: none; }
.btn-ghost { background: transparent; color: var(--ink2); border: 1px solid var(--rule2); }
.btn-ghost:hover { background: var(--rule); }

.chip {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 12px; font-weight: 600; padding: 3px 9px;
  border-radius: 100px; letter-spacing: 0.01em; white-space: nowrap;
}
.chip-green { background: var(--green-bg); color: var(--green); }
.chip-gold  { background: var(--gold-bg);  color: var(--gold);  }
.chip-gray  { background: var(--rule);     color: var(--ink2);  }
.chip-red   { background: var(--red-bg);   color: var(--red);   }
.chip-blue  { background: var(--blue-bg);  color: var(--blue);  border: 1px solid var(--blue-rule); }

.cat-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 10px; border-radius: var(--r-sm);
  cursor: pointer; user-select: none;
  transition: background var(--transition);
}
.cat-item:hover    { background: var(--rule); }
.cat-item.selected { background: var(--gold-bg); }

.cat-toggle {
  width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
  border-radius: 5px; font-size: 10px; color: var(--ink3);
  transition: transform var(--transition); flex-shrink: 0;
}
.cat-toggle.open { transform: rotate(90deg); }

.mode-pill {
  flex: 1;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  border-radius: var(--r-sm);
  border: 1px solid var(--rule2);
  background: var(--card);
  color: var(--ink2);
  transition: all var(--transition);
}
.mode-pill.active {
  position: relative;
}
.mode-pill.active::before {
  content: "";
  position: absolute;
  top: -1px; left: 10px; right: 10px;
  height: 2px;
  border-radius: 999px;
  background: var(--gold);
}

.train-pill {
  flex: 1;
  padding: 11px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  border-radius: var(--r-sm);
  border: 1px solid var(--rule2);
  background: var(--card);
  color: var(--ink2);
  transition: all var(--transition);
  cursor: pointer;
  position: relative;
}
.train-pill.active {
  color: var(--ink);
  border-color: var(--blue-rule);
  background: var(--blue-bg);
}
.train-pill.active::before {
  content: "";
  position: absolute;
  top: -1px; left: 10px; right: 10px;
  height: 2px;
  border-radius: 999px;
  background: var(--blue);
}

.timer-opt {
  flex: 1;
  padding: 8px 4px;
  font-size: 13px;
  font-weight: 600;
  border-radius: var(--r-sm);
  border: 1px solid var(--rule2);
  background: var(--card);
  color: var(--ink2);
  transition: all var(--transition);
  cursor: pointer;
  text-align: center;
}
.timer-opt.active {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}
.timer-opt:hover:not(.active) { background: var(--rule); }

.study-word {
  font-family: 'DM Serif Display', Georgia, serif;
  font-style: italic;
  font-size: clamp(30px, 7vw, 46px);
  line-height: 1.15; color: var(--ink); letter-spacing: -0.5px;
}
.study-answer { font-size: 22px; font-weight: 500; color: var(--ink); line-height: 1.3; }

.timer-track {
  height: 3px; background: var(--rule);
  position: absolute; top: 0; left: 0; right: 0;
  border-radius: var(--r) var(--r) 0 0; overflow: hidden;
}
.timer-fill {
  height: 100%; width: 100%; background: var(--gold);
  transform-origin: left center;
}
.divider { height: 1px; background: var(--rule); }

.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.38);
  display: flex; align-items: flex-end;
  z-index: 100; animation: fadeIn 0.18s ease;
}
@media (min-width: 480px) { .overlay { align-items: center; } }
.overlay-panel {
  background: var(--card); border: 1px solid var(--rule);
  border-radius: var(--r) var(--r) 0 0;
  width: 100%; max-height: 80vh; overflow-y: auto;
  padding: 0 0 1.5rem;
  animation: slideDown 0.22s ease;
}
@media (min-width: 480px) {
  .overlay-panel { max-width: 440px; border-radius: var(--r); margin: auto; max-height: 72vh; }
}
.overlay-panel::-webkit-scrollbar { width: 4px; }
.overlay-panel::-webkit-scrollbar-thumb { background: var(--rule2); border-radius: 2px; }

.cat-badge { display: inline-flex; align-items: center; font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 100px; }
.cat-badge-has-repeat { background: var(--green-bg); border: 1px solid var(--green-rule); color: var(--green); }
.cat-badge-no-repeat  { background: var(--rule); color: var(--ink2); }
.cat-badge .repeat-part { color: var(--green); }
.cat-badge-has-repeat .repeat-part { color: var(--green); }
.cat-badge-no-repeat  .repeat-part { color: var(--ink3); }

.pill-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
.pill-count-repeat  { color: var(--green); border: 1px solid var(--green); background: transparent; }
.pill-count-default { color: var(--ink2);  border: 1px solid var(--rule2); background: transparent; }
.pill-count-zero    { color: inherit;      border: 1px solid var(--rule2); background: transparent; }

.interval-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 700; padding: 3px 9px;
  border-radius: 100px;
  background: var(--blue-bg); color: var(--blue);
  border: 1px solid var(--blue-rule);
}
`

export default function App() {
  const [api]      = useState(() => new Api());
  const [screen,   setScreen]   = useState("start");
  const [categories, setCategories] = useState([]);
  const [selectedCatIds, setSelectedCatIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LAST_CAT_KEY) ?? "[]"); } catch { return []; }
  });
  const [mode,     setMode]     = useState(() => localStorage.getItem(LAST_MODE_KEY) ?? "due");
  // trainMode: "review" | "learn"
  const [trainMode, setTrainMode] = useState(() => localStorage.getItem(LAST_TRAIN_KEY) ?? "review");
  const [timerSec,  setTimerSec]  = useState(() => {
    const s = localStorage.getItem(LAST_TIMER_KEY);
    return s ? Number(s) : 3;
  });
  const [catOpen,  setCatOpen]  = useState(false);
  const [loading,  setLoading]  = useState(true);

  // Study state
  const [cards,           setCards]           = useState([]);
  const [cardIdx,         setCardIdx]         = useState(0);
  const [cardState,       setCardState]       = useState("question");
  const [learnedCount,    setLearnedCount]    = useState(0);
  const [notLearnedCount, setNotLearnedCount] = useState(0);
  const [uniqueLeft,      setUniqueLeft]      = useState(0);
  const [stats,           setStats]           = useState(null);

  // Learn mode UI state
  const [learnInterval, setLearnInterval] = useState(10);
  const [learnErrors,   setLearnErrors]   = useState(0);

  // Refs
  const cardsRef     = useRef([]);
  const cardIdxRef   = useRef(0);
  const cardStateRef = useRef("question");
  const repeatsRef   = useRef([]);
  const timerSecRef  = useRef(timerSec);
  const trainModeRef = useRef(trainMode);

  // Review mode tracking
  const failedOnceRef   = useRef(new Set());
  const outcomeSetRef   = useRef(new Set());
  const insertedOnceRef = useRef(new Set());
  const learnedRef      = useRef(0);
  const notLearnedRef   = useRef(0);
  const totalUniqueRef  = useRef(0);
  const processedRef    = useRef(new Set());

  // Learn mode tracking
  const learnIntervalRef  = useRef(10);
  const learnErrorsRef    = useRef(0);
  const learnFailedRef    = useRef(new Set()); // failed in current pass

  const stopTimerRef = useRef(null);

  const syncCards = (v) => { cardsRef.current = v; setCards(v); };
  const syncIdx   = (v) => { cardIdxRef.current = v; setCardIdx(v); };
  const syncState = (v) => { cardStateRef.current = v; setCardState(v); };

  const recalcLeft = () => {
    setUniqueLeft(Math.max(0, totalUniqueRef.current - processedRef.current.size));
  };

  useEffect(() => {
    Promise.all([api.getCategories(), api.getRepeats()]).then(([cats, reps]) => {
      setCategories(cats);
      repeatsRef.current = reps;
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(LAST_CAT_KEY, JSON.stringify(selectedCatIds));
  }, [selectedCatIds]);

  useEffect(() => { localStorage.setItem(LAST_MODE_KEY, mode); }, [mode]);

  useEffect(() => {
    localStorage.setItem(LAST_TRAIN_KEY, trainMode);
    trainModeRef.current = trainMode;
  }, [trainMode]);

  useEffect(() => {
    localStorage.setItem(LAST_TIMER_KEY, String(timerSec));
    timerSecRef.current = timerSec;
  }, [timerSec]);

  // Timer effect — runs per card/state change
  useEffect(() => {
    if (screen !== "study" || cardStateRef.current !== "question") return;
    const sec = timerSecRef.current;
    const end = Date.now() + sec * 1000;
    const id = setInterval(() => {
      if (Date.now() >= end) { clearInterval(id); handleTimerExpire(); }
    }, 80);
    stopTimerRef.current = () => clearInterval(id);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, cardState, cardIdx]);

  const handleTimerExpire = () => {
    const card = cardsRef.current[cardIdxRef.current];
    if (!card) return;
    const alreadyFailed = failedOnceRef.current.has(card.id);
    failedOnceRef.current.add(card.id);
    if (trainModeRef.current === "learn" && !alreadyFailed) {
      learnFailedRef.current.add(card.id);
      learnErrorsRef.current++;
      setLearnErrors(learnErrorsRef.current);
    }
    syncState("answer");
  };

  const handleStart = async () => {
    const opts = selectedCatIds.length > 0 ? { categoryIds: selectedCatIds } : {};
    let deck;
    if (mode === "due") {
      deck = shuffle(await api.getRepeatCards(opts));
    } else {
      deck = shuffle(await api.getAllCards(opts));
    }
    if (!deck.length) return;

    if (trainMode === "learn") {
      // Start from the user-selected timer value (or the closest higher interval)
      const selected = timerSecRef.current;
      const startInterval = LEARN_INTERVALS.find(i => i <= selected) ?? LEARN_INTERVALS[LEARN_INTERVALS.length - 1];
      learnIntervalRef.current = startInterval;
      learnErrorsRef.current   = 0;
      learnFailedRef.current   = new Set();
      failedOnceRef.current    = new Set();
      totalUniqueRef.current   = deck.length;

      setLearnInterval(startInterval);
      setLearnErrors(0);
      timerSecRef.current = startInterval;
      setUniqueLeft(deck.length);
    } else {
      failedOnceRef.current   = new Set();
      outcomeSetRef.current   = new Set();
      insertedOnceRef.current = new Set();
      learnedRef.current      = 0;
      notLearnedRef.current   = 0;
      totalUniqueRef.current  = deck.length;
      processedRef.current    = new Set();

      setLearnedCount(0);
      setNotLearnedCount(0);
      setUniqueLeft(deck.length);
    }

    syncCards(deck);
    syncIdx(0);
    syncState("question");
    setScreen("study");
  };

  const handleReveal = () => {
    stopTimerRef.current?.();
    const card = cardsRef.current[cardIdxRef.current];
    if (!card) return;
    const alreadyFailed = failedOnceRef.current.has(card.id);
    failedOnceRef.current.add(card.id);
    if (trainModeRef.current === "learn" && !alreadyFailed) {
      // Count error immediately on first reveal/expire per card per pass
      learnFailedRef.current.add(card.id);
      learnErrorsRef.current++;
      setLearnErrors(learnErrorsRef.current);
    }
    syncState("answer");
  };

  const callApiBackground = (card, outcome) => {
    if (outcome === "learned") {
      const { repeat_date_timestamp, repeat_after } = nextRepeat(card, repeatsRef.current);
      api.markCardLearned(card.id, repeat_date_timestamp, repeat_after).catch(() => {});
    } else {
      api.markCardNotLearned(card.id).catch(() => {});
    }
  };

  // ── Learn mode: next card ──
  const handleNextLearn = () => {
    stopTimerRef.current?.();
    const cards = cardsRef.current;
    const idx   = cardIdxRef.current;
    const card  = cards[idx];
    if (!card) return;

    // If failed this show, ensure it's tracked
    if (failedOnceRef.current.has(card.id)) {
      learnFailedRef.current.add(card.id);
    }
    failedOnceRef.current.delete(card.id);

    const nextIdx = idx + 1;
    if (nextIdx < cards.length) {
      // More cards in this pass — just advance
      const remaining = totalUniqueRef.current - nextIdx;
      setUniqueLeft(remaining);
      syncIdx(nextIdx);
      syncState("question");
      return;
    }

    // ── End of pass ──
    const hadErrors = learnFailedRef.current.size > 0;

    if (hadErrors) {
      // Had errors — reshuffle, repeat at same interval, reset counter for new pass
      learnErrorsRef.current = 0;
      setLearnErrors(0);
      learnFailedRef.current = new Set();
      failedOnceRef.current  = new Set();
      const reshuffled = shuffle([...cards]);
      setUniqueLeft(reshuffled.length);
      syncCards(reshuffled);
      syncIdx(0);
      syncState("question");
    } else {
      // Clean pass — advance interval
      const curIdx  = LEARN_INTERVALS.indexOf(learnIntervalRef.current);
      const nextIntIdx = curIdx + 1;

      if (nextIntIdx >= LEARN_INTERVALS.length) {
        // Was at 1s and clean — done!
        setStats({ learnMode: true, total: totalUniqueRef.current });
        setScreen("complete");
        return;
      }

      const nextInterval = LEARN_INTERVALS[nextIntIdx];
      learnIntervalRef.current = nextInterval;
      learnErrorsRef.current   = 0;
      learnFailedRef.current   = new Set();
      failedOnceRef.current    = new Set();
      setLearnInterval(nextInterval);
      setLearnErrors(0);
      setTimerSec(nextInterval);
      timerSecRef.current = nextInterval;

      const reshuffled = shuffle([...cards]);
      setUniqueLeft(reshuffled.length);
      syncCards(reshuffled);
      syncIdx(0);
      syncState("question");
    }
  };

  // ── Review mode: next card (original algorithm) ──
  const handleNextReview = () => {
    stopTimerRef.current?.();
    const cards = cardsRef.current;
    const idx   = cardIdxRef.current;
    const card  = cards[idx];
    if (!card) return;

    const failed      = failedOnceRef.current.has(card.id);
    const hadOutcome  = outcomeSetRef.current.has(card.id);
    const wasInserted = insertedOnceRef.current.has(card.id);
    let newCards = [...cards];

    if (!failed) {
      if (!wasInserted) {
        if (card.repeatable && !hadOutcome) {
          outcomeSetRef.current.add(card.id);
          learnedRef.current++;
          setLearnedCount(learnedRef.current);
          callApiBackground(card, "learned");
        }
        processedRef.current.add(card.id);
        recalcLeft();
      } else {
        recalcLeft();
      }
    } else {
      if (!hadOutcome) {
        outcomeSetRef.current.add(card.id);
        notLearnedRef.current++;
        setNotLearnedCount(notLearnedRef.current);
        processedRef.current.add(card.id);
        callApiBackground(card, "notLearned");
        recalcLeft();
      }
      insertedOnceRef.current.add(card.id);
      const remaining = newCards.slice(idx + 1);
      const insertAt  = idx + 1 + Math.floor(remaining.length / 2);
      newCards.splice(insertAt, 0, card);
      failedOnceRef.current.delete(card.id);
    }

    const nextIdx = idx + 1;
    if (nextIdx >= newCards.length) {
      setStats({ learned: learnedRef.current, notLearned: notLearnedRef.current });
      setScreen("complete");
      return;
    }

    syncCards(newCards);
    syncIdx(nextIdx);
    syncState("question");
  };

  const handleNext = () => {
    if (trainModeRef.current === "learn") handleNextLearn();
    else handleNextReview();
  };

  const handleReturn = async () => {
    const cats = await api.getCategories();
    setCategories(cats);
    setScreen("start");
  };

  const handleToggleCollapsed = (categoryId, collapsed) => {
    const patchTree = (list) => list.map(cat => {
      if (cat.id === categoryId) return { ...cat, collapsed };
      if (cat.nested?.length) return { ...cat, nested: patchTree(cat.nested) };
      return cat;
    });
    setCategories(prev => patchTree(prev));
    api.setCategoryCollapsed(categoryId, collapsed);
  };

  const handleTrainMode = (tm) => {
    setTrainMode(tm);
    const def = tm === "learn" ? 10 : 3;
    setTimerSec(def);
    timerSecRef.current = def;
  };

  const selectedCounts = (() => {
    if (selectedCatIds.length === 0) {
      return {
        total:  categories.reduce((s, c) => s + countAll(c).total,  0),
        repeat: categories.reduce((s, c) => s + countAll(c).repeat, 0),
      };
    }
    if (selectedCatIds.length === 1) {
      const cat = findCat(categories, selectedCatIds[0]);
      return cat ? countAll(cat) : { total: 0, repeat: 0 };
    }
    // Несколько категорий: суммируем countAll для каждой выбранной (топ-уровня),
    // чтобы не дублировать вложенные
    let total = 0, repeat = 0;
    for (const id of selectedCatIds) {
      const cat = findCat(categories, id);
      if (cat) { const c = countAll(cat); total += c.total; repeat += c.repeat; }
    }
    return { total, repeat };
  })();

  const selectedLabel = (() => {
    if (selectedCatIds.length === 0) return "Все категории";
    if (selectedCatIds.length === 1) return findCat(categories, selectedCatIds[0])?.name ?? "Все категории";
    return `Категорий: ${selectedCatIds.length}`;
  })();

  const categoryEmoji = (() => {
    if (selectedCatIds.length === 0) return "📋";
    if (selectedCatIds.length === 1) return "📁";
    return "🗂️";
  })();

  if (loading) return (
    <div className="fc-root" style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <style>{CSS}</style>
      <span style={{ color:"var(--ink3)", fontSize:14, animation:"pulse 1.5s infinite" }}>Загрузка…</span>
    </div>
  );

  return (
    <div className="fc-root">
      <style>{CSS}</style>

      {screen === "start" && (
        <StartScreen
          categories={categories}
          selectedCatIds={selectedCatIds}
          selectedLabel={selectedLabel}
          selectedCounts={selectedCounts}
          categoryEmoji={categoryEmoji}
          mode={mode}
          trainMode={trainMode}
          timerSec={timerSec}
          catOpen={catOpen}
          onOpenCat={() => setCatOpen(true)}
          onCloseCat={() => setCatOpen(false)}
          onSelectCat={(ids) => { setSelectedCatIds(ids); setCatOpen(false); }}
          onCheckCat={(ids) => setSelectedCatIds(ids)}
          onMode={setMode}
          onTrainMode={handleTrainMode}
          onTimerSec={setTimerSec}
          onStart={handleStart}
          onToggleCollapsed={handleToggleCollapsed}
        />
      )}

      {screen === "study" && cards[cardIdx] && (
        <StudyScreen
          card={cards[cardIdx]}
          cardState={cardState}
          cardIdx={cardIdx}
          timerSec={timerSec}
          trainMode={trainMode}
          learnInterval={learnInterval}
          learnErrors={learnErrors}
          isRepeat={insertedOnceRef.current.has(cards[cardIdx]?.id)}
          learnedCount={learnedCount}
          notLearnedCount={notLearnedCount}
          uniqueLeft={uniqueLeft}
          onReveal={handleReveal}
          onNext={handleNext}
        />
      )}

      {screen === "complete" && (
        <CompleteScreen stats={stats} onReturn={handleReturn} />
      )}
    </div>
  );
}

/* ══ START SCREEN ══ */

function StartScreen({
  categories, selectedCatIds, selectedLabel, selectedCounts, categoryEmoji,
  mode, trainMode, timerSec,
  catOpen, onOpenCat, onCloseCat, onSelectCat, onCheckCat,
  onMode, onTrainMode, onTimerSec, onStart, onToggleCollapsed
}) {
  const canStart = mode === "due" ? selectedCounts.repeat > 0 : selectedCounts.total > 0;

  const hintText = trainMode === "learn"
    ? "🧠 Карточки повторяются кругами. При чистом прогоне интервал снижается: 10→5→3→2→1 с. Расписание не меняется."
    : mode === "due"
      ? "⏱ Только карточки с наступившей датой повторения. Алгоритм обновит расписание."
      : "📚 Все карточки категории. Расписание изменится только у карточек с повторением.";

  const hintColor  = trainMode === "learn" ? "var(--blue)"      : mode === "due" ? "var(--gold)"      : "var(--ink2)";
  const hintBg     = trainMode === "learn" ? "var(--blue-bg)"   : mode === "due" ? "var(--gold-bg)"   : "var(--rule)";
  const hintBorder = trainMode === "learn" ? "var(--blue-rule)" : mode === "due" ? "var(--gold-rule)" : "var(--rule2)";

  return (
    <>
      <div style={{ maxWidth:400, margin:"0 auto", paddingTop:"2.5rem", display:"flex", flexDirection:"column", gap:"1.25rem" }}>
        <p style={{ fontSize:26, fontFamily:"'DM Serif Display', Georgia, serif", lineHeight:1.1 }}>
          Повторение слов
        </p>

        {/* Category */}
        <div>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--ink3)", marginBottom:8 }}>Категория</p>
          <button
            onClick={onOpenCat}
            style={{
              width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 14px", borderRadius:"var(--r-sm)",
              background:"var(--card)", border:"1px solid var(--rule2)",
              color:"var(--ink)", fontSize:14, fontWeight:500, cursor:"pointer",
            }}
          >
            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:15 }}>{categoryEmoji}</span>
              {selectedLabel}
            </span>
            <span style={{ color:"var(--ink3)", fontSize:12 }}>▾</span>
          </button>
        </div>

        {/* Train mode */}
        <div>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--ink3)", marginBottom:8 }}>Тренировка</p>
          <div style={{ display:"flex", gap:8 }}>
            {[
              { id:"review", label:"Повторение", icon:"⏱" },
              { id:"learn",  label:"Изучение",   icon:"🧠" },
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                className={`train-pill${trainMode === id ? " active" : ""}`}
                onClick={() => onTrainMode(id)}
              >
                <span style={{ fontSize:18 }}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Card mode */}
        <div>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--ink3)", marginBottom:8 }}>Карточки</p>
          <div style={{ display:"flex", gap:8 }}>
            <ModeButton active={mode==="due"} label="Готовые" count={selectedCounts.repeat} hasRepeat={selectedCounts.repeat>0} onClick={() => onMode("due")} />
            <ModeButton active={mode==="all"} label="Все"     count={selectedCounts.total}  hasRepeat={false}                  onClick={() => onMode("all")} />
          </div>
        </div>

        {/* Timer */}
        <div>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--ink3)", marginBottom:8 }}>Интервал таймера</p>
          <div style={{ display:"flex", gap:6 }}>
            {TIMER_OPTIONS.map(sec => (
              <button key={sec} className={`timer-opt${timerSec===sec?" active":""}`} onClick={() => onTimerSec(sec)}>
                {sec}с
              </button>
            ))}
          </div>
        </div>

        {/* Hint */}
        <div style={{
          padding:"11px 14px", borderRadius:"var(--r-sm)",
          background: hintBg, border:`1px solid ${hintBorder}`,
          fontSize:13, color: hintColor, lineHeight:1.5,
        }}>
          {hintText}
        </div>

        <button onClick={onStart} disabled={!canStart} className="btn btn-primary" style={{ width:"100%", padding:"14px", fontSize:15, marginTop:"0.1rem" }}>
          Начать →
        </button>
      </div>

      {catOpen && (
        <CategoryBrowser
          categories={categories}
          selectedCatIds={selectedCatIds}
          onSelect={(id) => onSelectCat(id === null ? [] : [id])}
          onCheck={onCheckCat}
          onClose={onCloseCat}
          onToggleCollapsed={onToggleCollapsed}
        />
      )}
    </>
  );
}

function ModeButton({ active, label, count, hasRepeat, onClick }) {
  let badgeClass = "pill-count";
  if      (count > 0 && hasRepeat) badgeClass += " pill-count-repeat";
  else if (count > 0)              badgeClass += " pill-count-default";
  else                             badgeClass += " pill-count-zero";

  return (
    <button onClick={onClick} className={`mode-pill${active?" active":""}`}>
      <span>{label}</span>
      <span className={badgeClass}>{count}</span>
    </button>
  );
}

/* ══ CATEGORY BROWSER ══ */

function CategoryBrowser({ categories, selectedCatIds, onSelect, onCheck, onClose, onToggleCollapsed }) {
  const totalAll  = categories.reduce((s, c) => s + countAll(c).total,  0);
  const repeatAll = categories.reduce((s, c) => s + countAll(c).repeat, 0);

  // Собрать все id категории + вложенных
  // const collectIds = (cat) => [cat.id, ...(cat.nested ?? []).flatMap(collectIds)];

  const handleCheck = (cat, checked) => {
    const ids = [cat.id];
    if (checked) {
      // добавляем все id этой ветки
      onCheck([...new Set([...selectedCatIds, ...ids])]);
    } else {
      // убираем все id этой ветки
      const remove = new Set(ids);
      onCheck(selectedCatIds.filter(id => !remove.has(id)));
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-panel" onClick={e => e.stopPropagation()}>
        <div style={{
          position:"sticky", top:0, background:"var(--card)",
          padding:"15px 16px 12px", borderBottom:"1px solid var(--rule)",
          display:"flex", alignItems:"center", justifyContent:"space-between"
        }}>
          <span style={{ fontSize:15, fontWeight:600 }}>Категория</span>
          <button onClick={onClose} style={{ color:"var(--ink3)", fontSize:18, lineHeight:1, padding:"2px 6px" }}>✕</button>
        </div>
        <div style={{ padding:"8px 8px 4px" }}>
          <div className={`cat-item${selectedCatIds.length === 0 ? " selected" : ""}`} onClick={() => onSelect(null)}>
            <span style={{ fontSize:14, fontWeight:500 }}>📋 Все категории</span>
            <CatBadge repeat={repeatAll} total={totalAll} />
          </div>
        </div>
        <div className="divider" style={{ margin:"4px 8px" }} />
        <div style={{ padding:"4px 8px 8px" }}>
          {categories.map(cat => (
            <CatNode key={cat.id} cat={cat} depth={0}
              selectedCatIds={selectedCatIds}
              onSelect={onSelect}
              onCheck={handleCheck}
              onToggleCollapsed={onToggleCollapsed} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CatBadge({ repeat, total }) {
  const hasRepeat = repeat > 0;
  return (
    <span className={`cat-badge ${hasRepeat?"cat-badge-has-repeat":"cat-badge-no-repeat"}`}>
      {hasRepeat && <span className="repeat-part">{repeat}&nbsp;/&nbsp;</span>}
      <span>{total}</span>
    </span>
  );
}

function CatNode({ cat, depth, selectedCatIds, onSelect, onCheck, onToggleCollapsed }) {
  const hasChildren = (cat.nested ?? []).length > 0;
  const isOpen      = !cat.collapsed;
  const isSelected  = selectedCatIds.includes(cat.id);
  const { total, repeat } = countAll(cat);

  return (
    <div>
      <div
        className={`cat-item${isSelected ? " selected" : ""}`}
        style={{ paddingLeft: 10 + depth * 18 }}
        onClick={() => onSelect(cat.id)}
      >
        <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:14, fontWeight: depth===0?500:400 }}>
          {hasChildren
            ? <button
                onClick={e => { e.stopPropagation(); onToggleCollapsed(cat.id, isOpen); }}
                className={`cat-toggle${isOpen?" open":""}`}
                style={{ background:"var(--rule)", border:"none" }}>▶</button>
            : <span style={{ width:20 }} />
          }
          {depth===0?"📁":"📄"}{" "}{cat.name}
        </span>
        <span style={{ display:"flex", alignItems:"center", gap:8 }}>
          <CatBadge repeat={repeat} total={total} />
          <span
            onClick={e => { e.stopPropagation(); onCheck(cat, !isSelected); }}
            style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
              border: `2px solid ${isSelected ? "var(--gold)" : "var(--rule2)"}`,
              background: isSelected ? "var(--gold)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all var(--transition)",
            }}
          >
            {isSelected && <span style={{ color:"#fff", fontSize:11, lineHeight:1, fontWeight:700 }}>✓</span>}
          </span>
        </span>
      </div>
      {hasChildren && isOpen && (
        <div>
          {cat.nested.map(child => (
            <CatNode key={child.id} cat={child} depth={depth+1}
              selectedCatIds={selectedCatIds}
              onSelect={onSelect}
              onCheck={onCheck}
              onToggleCollapsed={onToggleCollapsed} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ══ STUDY SCREEN ══ */

function StudyScreen({
  card, cardState, cardIdx, timerSec, trainMode,
  learnInterval, learnErrors,
  isRepeat, learnedCount, notLearnedCount, uniqueLeft,
  onReveal, onNext
}) {
  if (!card) return null;
  const showAnswer = cardState === "answer";
  const isLearn    = trainMode === "learn";

  return (
    <div style={{ maxWidth:480, margin:"0 auto", paddingTop:"1.75rem", display:"flex", flexDirection:"column", gap:"1rem" }}>

      {/* Progress row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {isLearn ? (
            <>
              <span className="interval-badge">⏱ {learnInterval}с</span>
              {learnErrors > 0 && <span className="chip chip-red">✗ {learnErrors}</span>}
            </>
          ) : (
            <>
              <span className="interval-badge">⏱ {timerSec}с</span>
              {notLearnedCount > 0 && <span className="chip chip-gold">↺ {notLearnedCount}</span>}
            </>
          )}
        </div>
        <span style={{ fontSize:12, color:"var(--ink3)", fontWeight:500 }}>осталось {uniqueLeft}</span>
      </div>

      {/* Card */}
      <div key={`card-${cardIdx}`} className="surface"
        style={{ position:"relative", overflow:"hidden", animation:"fadeUp 0.22s ease" }}>

        <div className="timer-track">
          <div
            key={`bar-${cardIdx}-${timerSec}`}
            className="timer-fill"
            style={{
              animation: !showAnswer ? `barShrink ${timerSec}s linear forwards` : "none",
              transform: showAnswer ? "scaleX(0)" : undefined,
            }}
          />
        </div>

        <div style={{ padding:"1.75rem 2rem 2rem" }}>
          <div style={{ display:"flex", gap:6, marginBottom:14, minHeight:22 }}>
            {isLearn  && <span className="chip chip-blue" style={{ fontSize:11 }}>🧠 изучение</span>}
            {isRepeat && !isLearn && <span className="chip chip-gold" style={{ fontSize:11 }}>↺ повтор</span>}
            {!card.repeatable && <span className="chip chip-gray" style={{ fontSize:11 }}>без расписания</span>}
          </div>

          <p className="study-word">{card.question}</p>

          {showAnswer && (
            <div style={{ marginTop:"1.75rem", animation:"fadeUp 0.2s ease" }}>
              <div className="divider" style={{ marginBottom:"1.5rem" }} />
              <p className="study-answer">{card.answer}</p>
              {card.comment && <p style={{ fontSize:13, color:"var(--ink2)", marginTop:10, lineHeight:1.6 }}>{card.comment}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display:"flex", gap:10 }}>
        {!showAnswer ? (
          <>
            <button onClick={onReveal} className="btn btn-ghost" style={{ flex:1 }}>Посмотреть</button>
            <button onClick={onNext}   className="btn btn-primary" style={{ flex:1 }}>Знаю →</button>
          </>
        ) : (
          <button onClick={onNext} className="btn btn-primary" style={{ width:"100%", padding:"14px 0", fontSize:15 }}>
            Дальше →
          </button>
        )}
      </div>
    </div>
  );
}

/* ══ COMPLETE SCREEN ══ */

function CompleteScreen({ stats, onReturn }) {
  const isLearn    = stats?.learnMode ?? false;
  const learned    = stats?.learned    ?? 0;
  const notLearned = stats?.notLearned ?? 0;
  const total      = isLearn ? (stats?.total ?? 0) : learned + notLearned;
  const pct        = !isLearn && total > 0 ? Math.round((learned / total) * 100) : 0;

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"80vh", padding:"2rem" }}>
      <div className="surface" style={{ maxWidth:360, width:"100%", padding:"2.5rem 2rem 2rem", textAlign:"center", animation:"popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>

        {isLearn ? (
          <>
            <div style={{ fontSize:56, marginBottom:12 }}>🎉</div>
            <p style={{ fontSize:22, fontFamily:"'DM Serif Display', Georgia, serif", marginBottom:8 }}>Все слова выучены!</p>
            <p style={{ fontSize:14, color:"var(--ink3)", marginBottom:"1.75rem" }}>Карточек пройдено: {total}</p>
          </>
        ) : (
          <>
            <div style={{ fontSize:72, fontWeight:700, lineHeight:1, fontVariantNumeric:"tabular-nums",
              color: pct>=80?"var(--green)":"var(--gold)", letterSpacing:"-3px", marginBottom:8 }}>
              {pct}<span style={{ fontSize:36, letterSpacing:"-1px" }}>%</span>
            </div>
            <p style={{ fontSize:14, color:"var(--ink3)", marginBottom:"1.75rem" }}>
              {pct>=80?"Отличный результат!":pct>=50?"Хороший прогресс":"Продолжайте практику"}
            </p>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
              border:"1px solid var(--rule)", borderRadius:"var(--r-sm)", overflow:"hidden", marginBottom:"1.75rem" }}>
              {[
                { label:"усвоено",       value:learned,    color:"var(--green)" },
                { label:"на повторение", value:notLearned, color:"var(--gold)"  },
              ].map((s, i) => (
                <div key={i} style={{ padding:"1.25rem 0.75rem", borderRight: i===0?"1px solid var(--rule)":"none" }}>
                  <div style={{ fontSize:42, fontWeight:700, lineHeight:1, color:s.color, letterSpacing:"-2px" }}>{s.value}</div>
                  <div style={{ fontSize:12, color:"var(--ink2)", marginTop:6 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <button onClick={onReturn} className="btn btn-primary" style={{ width:"100%", padding:"14px", fontSize:15 }}>
          Вернуться →
        </button>
      </div>
    </div>
  );
}