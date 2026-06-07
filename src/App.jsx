import { useState, useEffect, useRef } from "react";
import { Api } from './api'

/* ════════════════════════════════════════════
   УТИЛИТЫ
════════════════════════════════════════════ */

const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const LAST_CAT_KEY  = "fc_last_category_id";
const LAST_MODE_KEY = "fc_last_mode";

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

/* ════════════════════════════════════════════
   СТИЛИ
════════════════════════════════════════════ */
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

/* Category browser */
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

/* Mode pills */
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
  top: -1px;
  left: 10px;
  right: 10px;
  height: 2px;

  border-radius: 999px;

  background: var(--gold);
}

/* Study */
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

/* Overlay */
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

/* Cat badge */
.cat-badge { display: inline-flex; align-items: center; font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 100px; }
.cat-badge-has-repeat { background: var(--green-bg); border: 1px solid var(--green-rule); color: var(--green); }
.cat-badge-no-repeat  { background: var(--rule); color: var(--ink2); }
.cat-badge .repeat-part { color: var(--green); }
.cat-badge-has-repeat .repeat-part { color: var(--green); }
.cat-badge-no-repeat  .repeat-part { color: var(--ink3); }

/* Бэйджи */

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

.pill-count-repeat {
  color: var(--green);
  border: 1px solid var(--green);
  background: transparent;
}

.pill-count-default {
  color: var(--ink2);
  border: 1px solid var(--rule2);
  background: transparent;
}

.pill-count-zero {
  color: inherit;
  border: 1px solid var(--rule2);
  background: transparent;
}
`

/* ════════════════════════════════════════════
   APP
════════════════════════════════════════════ */

export default function App() {
  const [api]        = useState(() => new Api());
  const [screen,     setScreen]     = useState("start");
  const [categories, setCategories] = useState([]);
  const [repeats,    setRepeats]    = useState([]);
  const [selectedCatId, setSelectedCatId] = useState(() => localStorage.getItem(LAST_CAT_KEY) ?? null);
  const [mode,       setMode]       = useState(() => localStorage.getItem(LAST_MODE_KEY) ?? "due");
  const [catOpen,    setCatOpen]    = useState(false);
  const [loading,    setLoading]    = useState(true);

  // Study render state
  const [cards,         setCards]         = useState([]);
  const [cardIdx,       setCardIdx]       = useState(0);
  const [cardState,     setCardState]     = useState("question");
  const timerSec = 5;
  const [learnedCount,    setLearnedCount]    = useState(0);
  const [notLearnedCount, setNotLearnedCount] = useState(0);
  const [uniqueLeft,      setUniqueLeft]      = useState(0);
  const [stats,           setStats]           = useState(null);

  // Refs for synchronous access inside handlers
  const cardsRef     = useRef([]);
  const cardIdxRef   = useRef(0);
  const cardStateRef = useRef("question");
  const repeatsRef   = useRef([]);

  // Per-session tracking sets/maps (keyed by card.id)
  //
  // failedOnce:   Set<id>  — ответ был показан хотя бы один раз за текущий показ карточки.
  //               Сбрасывается при замешивании, чтобы следующий показ начинался чисто.
  //
  // outcomeSet:   Set<id>  — карточки, для которых уже зафиксирован итог (learned / notLearned).
  //               Используется, чтобы не вызывать API повторно и не менять счётчики.
  //
  // insertedOnce: Set<id>  — карточки, которые хотя бы раз были замешаны обратно в колоду
  //               (провалились). Когда такая карточка снова появляется, "Знаю" просто
  //               убирает её без повторного замешивания и без изменения счётчиков.
  const failedOnceRef   = useRef(new Set());
  const outcomeSetRef   = useRef(new Set());
  const insertedOnceRef = useRef(new Set());

  // Counters ref (for synchronous reads)
  const learnedRef    = useRef(0);
  const notLearnedRef = useRef(0);
  const totalUniqueRef= useRef(0);
  // Set of original card ids that have left the "active" pool (have a final outcome)
  const processedRef  = useRef(new Set());

  const stopTimerRef = useRef(null);

  // helpers
  const syncCards = (v) => { cardsRef.current = v; setCards(v); };
  const syncIdx   = (v) => { cardIdxRef.current = v; setCardIdx(v); };
  const syncState = (v) => { cardStateRef.current = v; setCardState(v); };

  const recalcLeft = () => {
    const left = Math.max(0, totalUniqueRef.current - processedRef.current.size);
    setUniqueLeft(left);
  };

  useEffect(() => {
    Promise.all([api.getCategories(), api.getRepeats()]).then(([cats, reps]) => {
      setCategories(cats);
      setRepeats(reps);
      repeatsRef.current = reps;
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedCatId) localStorage.setItem(LAST_CAT_KEY, selectedCatId);
    else localStorage.removeItem(LAST_CAT_KEY);
  }, [selectedCatId]);
  useEffect(() => { localStorage.setItem(LAST_MODE_KEY, mode); }, [mode]);

  // Timer — запускается только на вопросе
  useEffect(() => {
    if (screen !== "study" || cardStateRef.current !== "question") return;
    const end = Date.now() + timerSec * 1000;
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
    // Таймер истёк — считаем как "посмотрел ответ"
    failedOnceRef.current.add(card.id);
    syncState("answer");
  };

  const handleStart = async () => {
    const opts = { categoryId: selectedCatId ?? undefined };
    let deck;

    if (mode === "due") {
      const due = await api.getRepeatCards(opts);
      deck = shuffle(due);
    } else {
      const all = await api.getAllCards(opts);
      deck = shuffle(all);
    }

    if (!deck.length) return;

    // Reset all tracking state
    failedOnceRef.current   = new Set();
    outcomeSetRef.current   = new Set();
    insertedOnceRef.current = new Set();
    learnedRef.current      = 0;
    notLearnedRef.current   = 0;
    totalUniqueRef.current  = deck.length;
    processedRef.current    = new Set();

    cardsRef.current    = deck;
    cardIdxRef.current  = 0;
    cardStateRef.current= "question";

    setCards(deck);
    setCardIdx(0);
    setCardState("question");
    setLearnedCount(0);
    setNotLearnedCount(0);
    setUniqueLeft(deck.length);
    setScreen("study");
  };

  const handleReveal = () => {
    stopTimerRef.current?.();
    const card = cardsRef.current[cardIdxRef.current];
    if (!card) return;
    failedOnceRef.current.add(card.id);
    syncState("answer");
  };

  // Background API call — fire and forget
  const callApiBackground = (card, outcome) => {
    if (outcome === "learned") {
      const { repeat_date_timestamp, repeat_after } = nextRepeat(card, repeatsRef.current);
      api.markCardLearned(card.id, repeat_date_timestamp, repeat_after).catch(() => {});
    } else if (outcome === "notLearned") {
      api.markCardNotLearned(card.id).catch(() => {});
    }
  };

  const handleNext = () => {
    stopTimerRef.current?.();

    const cards = cardsRef.current;
    const idx   = cardIdxRef.current;
    const card  = cards[idx];
    if (!card) return;

    const failed      = failedOnceRef.current.has(card.id);
    const hadOutcome  = outcomeSetRef.current.has(card.id);   // итог уже был зафиксирован ранее
    const wasInserted = insertedOnceRef.current.has(card.id); // карточка уже возвращалась в колоду

    let newCards = [...cards];

    if (!failed) {
      // ══════════════════════════════════════════
      // Нажали "Знаю" (ответ не открывали, таймер не истёк)
      // ══════════════════════════════════════════

      if (!wasInserted) {
        // Первая попытка — знает с первого раза
        if (card.repeatable && !hadOutcome) {
          // Помечаем как выученную и вызываем API в фоне
          outcomeSetRef.current.add(card.id);
          learnedRef.current++;
          setLearnedCount(learnedRef.current);
          callApiBackground(card, "learned");
        }
        // Если !card.repeatable — ничего не помечаем, просто идём дальше
        processedRef.current.add(card.id);
        recalcLeft();
      } else {
        // Карточка уже была замешана (провалилась раньше), теперь нажали "Знаю"
        // Итог уже зафиксирован (notLearned), счётчики не меняем, просто убираем карточку
        // processedRef уже содержит этот id (был добавлен при первом провале)
        recalcLeft();
      }

    } else {
      // ══════════════════════════════════════════
      // Открыли ответ / не успели по таймеру
      // ══════════════════════════════════════════

      if (!hadOutcome) {
        // Первый провал: фиксируем итог notLearned
        outcomeSetRef.current.add(card.id);
        notLearnedRef.current++;
        setNotLearnedCount(notLearnedRef.current);
        processedRef.current.add(card.id);
        callApiBackground(card, "notLearned");
        recalcLeft();
      }
      // При любом провале (первом или повторном) — замешиваем карточку в середину оставшихся
      insertedOnceRef.current.add(card.id);
      const remaining = newCards.slice(idx + 1);
      const insertAt  = idx + 1 + Math.floor(remaining.length / 2);
      newCards.splice(insertAt, 0, card);
      // Сбрасываем failed-флаг, чтобы следующий показ этой карточки начинался чисто
      failedOnceRef.current.delete(card.id);
    }

    const nextIdx = idx + 1;
    if (nextIdx >= newCards.length) {
      setStats({
        learned:    learnedRef.current,
        notLearned: notLearnedRef.current,
      });
      setScreen("complete");
      return;
    }

    syncCards(newCards);
    syncIdx(nextIdx);
    syncState("question");
  };

  const handleReturn = async () => {
    const cats = await api.getCategories();
    setCategories(cats);
    setScreen("start");
  };

  const selectedCounts = (() => {
    if (!selectedCatId) {
      const total  = categories.reduce((s, c) => s + countAll(c).total,  0);
      const repeat = categories.reduce((s, c) => s + countAll(c).repeat, 0);
      return { total, repeat };
    }
    const cat = findCat(categories, selectedCatId);
    return cat ? countAll(cat) : { total: 0, repeat: 0 };
  })();

  const selectedLabel = findCat(categories, selectedCatId)?.name ?? "Все категории";

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
          selectedCatId={selectedCatId}
          selectedLabel={selectedLabel}
          selectedCounts={selectedCounts}
          mode={mode}
          catOpen={catOpen}
          onOpenCat={() => setCatOpen(true)}
          onCloseCat={() => setCatOpen(false)}
          onSelectCat={id => { setSelectedCatId(id); setCatOpen(false); }}
          onMode={setMode}
          onStart={handleStart}
        />
      )}

      {screen === "study" && cards[cardIdx] && (
        <StudyScreen
          card={cards[cardIdx]}
          cardState={cardState}
          cardIdx={cardIdx}
          timerSec={timerSec}
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

/* ════════════════════════════════════════════
   START SCREEN
════════════════════════════════════════════ */

function StartScreen({ categories, selectedCatId, selectedLabel, selectedCounts, mode, catOpen, onOpenCat, onCloseCat, onSelectCat, onMode, onStart }) {
  return (
    <>
      <div style={{ maxWidth:400, margin:"0 auto", paddingTop:"2.5rem", display:"flex", flexDirection:"column", gap:"1.25rem" }}>

        <p style={{ fontSize:26, fontFamily:"'DM Serif Display', Georgia, serif", lineHeight:1.1 }}>
          Повторение слов
        </p>

        {/* Category selector */}
        <div>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--ink3)", marginBottom:8 }}>Категория</p>
          <button
            onClick={onOpenCat}
            style={{
              width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 14px", borderRadius:"var(--r-sm)",
              background:"var(--card)", border:"1px solid var(--rule2)",
              color:"var(--ink)", fontSize:14, fontWeight:500,
              cursor:"pointer", transition:"background var(--transition)"
            }}
          >
            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:15 }}>📂</span>
              {selectedLabel}
            </span>
            <span style={{ color:"var(--ink3)", fontSize:12 }}>▾</span>
          </button>
        </div>

        {/* Mode selector */}
        <div>
          <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--ink3)", marginBottom:8 }}>Режим</p>
          <div style={{ display:"flex", gap:8 }}>
            <ModeButton
              active={mode === "due"}
              label="Готовые"
              count={selectedCounts.repeat}
              hasRepeat={selectedCounts.repeat > 0}
              onClick={() => onMode("due")}
            />
            <ModeButton
              active={mode === "all"}
              label="Все"
              count={selectedCounts.total}
              hasRepeat={false}
              onClick={() => onMode("all")}
            />
          </div>
        </div>

        {/* Mode hint */}
        <div style={{
          padding:"11px 14px", borderRadius:"var(--r-sm)",
          background: mode === "due" ? "var(--gold-bg)" : "var(--rule)",
          border:`1px solid ${mode === "due" ? "var(--gold-rule)" : "var(--rule2)"}`,
          fontSize:13, color: mode === "due" ? "var(--gold)" : "var(--ink2)", lineHeight:1.5
        }}>
          {mode === "due"
            ? "⏱ Только карточки с наступившей датой повторения. Алгоритм обновит расписание."
            : "📚 Все карточки категории. Расписание изменится только у карточек с повторением."}
        </div>

        <button onClick={onStart} className="btn btn-primary" style={{ width:"100%", padding:"14px", fontSize:15, marginTop:"0.1rem" }}>
          Начать повторение →
        </button>
      </div>

      {catOpen && (
        <CategoryBrowser
          categories={categories}
          selectedCatId={selectedCatId}
          onSelect={onSelectCat}
          onClose={onCloseCat}
        />
      )}
    </>
  );
}

function ModeButton({ active, label, count, hasRepeat, onClick }) {
  let badgeClass = "pill-count";

  if (count > 0 && hasRepeat) {
    badgeClass += " pill-count-repeat";
  } else if (count > 0) {
    badgeClass += " pill-count-default";
  } else {
    badgeClass += " pill-count-zero";
  }

  if (active) {
    badgeClass += " pill-count-active";
  }

  return (
    <button
      onClick={onClick}
      className={`mode-pill${active ? " active" : ""}`}
    >
      <span>{label}</span>
      <span className={badgeClass}>{count}</span>
    </button>
  );
}

/* ════════════════════════════════════════════
   CATEGORY BROWSER
════════════════════════════════════════════ */

function CategoryBrowser({ categories, selectedCatId, onSelect, onClose }) {
  const [expanded, setExpanded] = useState(() => {
    const s = new Set();
    const expand = (list, target) => {
      for (const c of list) {
        if (c.id === target || expand(c.nested ?? [], target)) { s.add(c.id); return true; }
      }
      return false;
    };
    if (selectedCatId) expand(categories, selectedCatId);
    return s;
  });

  const toggle = id => setExpanded(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const totalAll  = categories.reduce((s, c) => s + countAll(c).total,  0);
  const repeatAll = categories.reduce((s, c) => s + countAll(c).repeat, 0);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-panel" onClick={e => e.stopPropagation()}>
        <div style={{
          position:"sticky", top:0, background:"var(--card)",
          padding:"15px 16px 12px",
          borderBottom:"1px solid var(--rule)",
          display:"flex", alignItems:"center", justifyContent:"space-between"
        }}>
          <span style={{ fontSize:15, fontWeight:600 }}>Категория</span>
          <button onClick={onClose} style={{ color:"var(--ink3)", fontSize:18, lineHeight:1, padding:"2px 6px" }}>✕</button>
        </div>

        <div style={{ padding:"8px 8px 4px" }}>
          <div
            className={`cat-item${!selectedCatId ? " selected" : ""}`}
            onClick={() => onSelect(null)}
          >
            <span style={{ fontSize:14, fontWeight:500 }}>📋 Все категории</span>
            <CatBadge repeat={repeatAll} total={totalAll} />
          </div>
        </div>

        <div className="divider" style={{ margin:"4px 8px" }} />

        <div style={{ padding:"4px 8px 8px" }}>
          {categories.map(cat => (
            <CatNode
              key={cat.id} cat={cat} depth={0}
              expanded={expanded} selectedCatId={selectedCatId}
              onSelect={onSelect} onToggle={toggle}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CatBadge({ repeat, total }) {
  const hasRepeat = repeat > 0;
  return (
    <span className={`cat-badge ${hasRepeat ? "cat-badge-has-repeat" : "cat-badge-no-repeat"}`}>
      {hasRepeat && <span className="repeat-part">{repeat}&nbsp;/&nbsp;</span>}
      <span>{total}</span>
    </span>
  );
}

function CatNode({ cat, depth, expanded, selectedCatId, onSelect, onToggle }) {
  const hasChildren = (cat.nested ?? []).length > 0;
  const isOpen      = expanded.has(cat.id);
  const isSelected  = cat.id === selectedCatId;
  const { total, repeat } = countAll(cat);

  return (
    <div>
      <div
        className={`cat-item${isSelected ? " selected" : ""}`}
        style={{ paddingLeft: 10 + depth * 18 }}
        onClick={() => onSelect(cat.id)}
      >
        <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:14, fontWeight: depth === 0 ? 500 : 400 }}>
          {hasChildren
            ? <button onClick={e => { e.stopPropagation(); onToggle(cat.id); }}
                className={`cat-toggle${isOpen ? " open" : ""}`}
                style={{ background:"var(--rule)", border:"none" }}>▶</button>
            : <span style={{ width:20 }} />
          }
          {depth === 0 ? "📁" : "📄"}{" "}{cat.name}
        </span>
        <CatBadge repeat={repeat} total={total} />
      </div>
      {hasChildren && isOpen && (
        <div>
          {cat.nested.map(child => (
            <CatNode key={child.id} cat={child} depth={depth+1}
              expanded={expanded} selectedCatId={selectedCatId}
              onSelect={onSelect} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   STUDY SCREEN
════════════════════════════════════════════ */

function StudyScreen({ card, cardState, cardIdx, timerSec, isRepeat, learnedCount, notLearnedCount, uniqueLeft, onReveal, onNext }) {
  if (!card) return null;
  const showAnswer = cardState === "answer";

  return (
    <div style={{ maxWidth:480, margin:"0 auto", paddingTop:"1.75rem", display:"flex", flexDirection:"column", gap:"1rem" }}>

      {/* Progress */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", gap:6 }}>
          <span className="chip chip-green">✓ {learnedCount}</span>
          {notLearnedCount > 0 && <span className="chip chip-gold">↺ {notLearnedCount}</span>}
        </div>
        <span style={{ fontSize:12, color:"var(--ink3)", fontWeight:500 }}>осталось {uniqueLeft}</span>
      </div>

      {/* Card */}
      <div key={`card-${cardIdx}`} className="surface"
        style={{ position:"relative", overflow:"hidden", animation:"fadeUp 0.22s ease" }}>

        <div className="timer-track">
          <div key={`bar-${cardIdx}`} className="timer-fill" style={{
            animation: !showAnswer ? `barShrink ${timerSec}s linear forwards` : "none",
            transform: showAnswer ? "scaleX(0)" : undefined,
          }} />
        </div>

        <div style={{ padding:"1.75rem 2rem 2rem" }}>
          <div style={{ display:"flex", gap:6, marginBottom:14, minHeight:22 }}>
            {isRepeat && <span className="chip chip-gold" style={{ fontSize:11 }}>↺ повтор</span>}
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

/* ════════════════════════════════════════════
   COMPLETE SCREEN
════════════════════════════════════════════ */

function CompleteScreen({ stats, onReturn }) {
  const learned    = stats?.learned    ?? 0;
  const notLearned = stats?.notLearned ?? 0;
  const total      = learned + notLearned;
  const pct        = total > 0 ? Math.round((learned / total) * 100) : 0;

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"80vh", padding:"2rem" }}>
      <div className="surface" style={{ maxWidth:360, width:"100%", padding:"2.5rem 2rem 2rem", textAlign:"center", animation:"popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ marginBottom:"1.75rem" }}>
          <div style={{ fontSize:72, fontWeight:700, lineHeight:1, fontVariantNumeric:"tabular-nums",
            color: pct >= 80 ? "var(--green)" : "var(--gold)", letterSpacing:"-3px" }}>
            {pct}<span style={{ fontSize:36, letterSpacing:"-1px" }}>%</span>
          </div>
          <p style={{ fontSize:14, color:"var(--ink3)", marginTop:8 }}>
            {pct >= 80 ? "Отличный результат!" : pct >= 50 ? "Хороший прогресс" : "Продолжайте практику"}
          </p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
          border:"1px solid var(--rule)", borderRadius:"var(--r-sm)", overflow:"hidden", marginBottom:"1.75rem" }}>
          {[
            { label:"усвоено",       value:learned,    color:"var(--green)" },
            { label:"на повторение", value:notLearned, color:"var(--gold)"  },
          ].map((s, i) => (
            <div key={i} style={{ padding:"1.25rem 0.75rem", borderRight: i===0 ? "1px solid var(--rule)" : "none" }}>
              <div style={{ fontSize:42, fontWeight:700, lineHeight:1, color:s.color, letterSpacing:"-2px" }}>{s.value}</div>
              <div style={{ fontSize:12, color:"var(--ink2)", marginTop:6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <button onClick={onReturn} className="btn btn-primary" style={{ width:"100%", padding:"14px", fontSize:15 }}>
          Вернуться →
        </button>
      </div>
    </div>
  );
}