import { useState, useEffect, useRef, useCallback } from "react";
import { Api } from "./api-mock";

/* ══════════════════════════════════════════════════════════
   УТИЛИТЫ
══════════════════════════════════════════════════════════ */

const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Подпись под большой цифрой — без повтора числа */
const dueLabel = n => {
  if (n === 0) return "нет карточек для повторения";
  const r10 = n % 10, r100 = n % 100;
  if (r100 >= 11 && r100 <= 19) return "слов ждут повторения";
  if (r10 === 1) return "слово ждёт повторения";
  if (r10 >= 2 && r10 <= 4) return "слова ждут повторения";
  return "слов ждут повторения";
};

/* ══════════════════════════════════════════════════════════
   GLOBAL CSS
══════════════════════════════════════════════════════════ */

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;1,400;1,500&display=swap');

  :root {
    --bg:           #f2efe8;
    --surface:      #ffffff;
    --border:       rgba(110, 92, 60, 0.13);
    --border-mid:   rgba(110, 92, 60, 0.2);
    --sh:           0 4px 28px rgba(110,92,60,0.13), 0 1px 4px rgba(110,92,60,0.07);
    --sh-sm:        0 1px 8px rgba(110,92,60,0.09);
    --text:         #1c160d;
    --text2:        #6b6050;
    --text3:        #a89880;
    --amber:        #c07808;
    --amber-pale:   #fef4dc;
    --amber-mid:    rgba(192,120,8,0.15);
    --amber-text:   #7a4f03;
    --green:        #2a7c50;
    --green-pale:   #e8f5ee;
    --r:            18px;
    --r-sm:         11px;
    --r-xs:         7px;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg:           #1a1710;
      --surface:      #232018;
      --border:       rgba(240,228,200,0.1);
      --border-mid:   rgba(240,228,200,0.18);
      --sh:           0 4px 28px rgba(0,0,0,0.5), 0 1px 6px rgba(0,0,0,0.25);
      --sh-sm:        0 1px 8px rgba(0,0,0,0.3);
      --text:         #f0ece0;
      --text2:        #988c78;
      --text3:        #665c4c;
      --amber:        #f0a820;
      --amber-pale:   #362206;
      --amber-mid:    rgba(240,168,32,0.15);
      --amber-text:   #f5c860;
      --green:        #40c078;
      --green-pale:   #0c2818;
    }
  }

  @keyframes timerShrink {
    from { transform: scaleX(1); }
    to   { transform: scaleX(0); }
  }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes answerIn {
    from { opacity:0; transform:translateY(10px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes popIn {
    from { opacity:0; transform:scale(0.88); }
    to   { opacity:1; transform:scale(1); }
  }

  * { box-sizing: border-box; }

  .fc-root {
    background: var(--bg);
    font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
    padding: 0 1rem 4rem;
    min-height: 560px;
  }

  .fc-card {
    background: var(--surface);
    border-radius: var(--r);
    box-shadow: var(--sh);
    border: 0.5px solid var(--border);
  }

  .fc-label {
    display: block;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text3);
    margin-bottom: 9px;
  }

  .fc-question {
    font-family: 'Lora', Georgia, 'Times New Roman', serif;
    font-style: italic;
    font-weight: 500;
    font-size: 36px;
    color: var(--text);
    line-height: 1.2;
    margin: 0;
    letter-spacing: -0.3px;
  }

  .fc-answer-text {
    font-size: 22px;
    font-weight: 500;
    color: var(--text);
    margin: 0 0 10px;
    line-height: 1.3;
  }

  .fc-comment {
    font-size: 14px;
    color: var(--text2);
    margin: 0;
    line-height: 1.7;
  }

  .fc-chip {
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 11px;
    border-radius: 100px;
    letter-spacing: 0.01em;
  }

  /* Buttons */
  .fc-btn {
    font-family: inherit;
    font-size: 15px;
    border-radius: var(--r-sm);
    cursor: pointer;
    transition: opacity 0.12s, transform 0.08s;
    letter-spacing: 0.01em;
  }
  .fc-btn:active { transform: scale(0.97); }

  .fc-btn-primary {
    background: var(--text);
    color: var(--surface);
    border: none;
    font-weight: 500;
  }
  .fc-btn-primary:hover:not(:disabled) { opacity: 0.84; }
  .fc-btn-primary:disabled {
    background: var(--border-mid);
    color: var(--text3);
    cursor: not-allowed;
  }

  .fc-btn-secondary {
    background: var(--surface);
    color: var(--text2);
    border: 1px solid var(--border-mid);
    box-shadow: var(--sh-sm);
  }
  .fc-btn-secondary:hover { opacity: 0.78; }

  .fc-btn-ghost {
    background: transparent;
    color: var(--text2);
    border: 1px solid var(--border-mid);
  }
  .fc-btn-ghost:hover { opacity: 0.75; }

  /* Timer pill chips */
  .fc-timer-btn {
    font-family: inherit;
    font-size: 14px;
    padding: 10px 0;
    border-radius: var(--r-sm);
    cursor: pointer;
    transition: all 0.14s;
  }
  .fc-timer-btn.active {
    font-weight: 600;
    background: var(--amber-pale);
    color: var(--amber-text);
    border: 1.5px solid var(--amber);
  }
  .fc-timer-btn:not(.active) {
    background: var(--surface);
    color: var(--text2);
    border: 1px solid var(--border-mid);
    box-shadow: var(--sh-sm);
  }
  .fc-timer-btn:not(.active):hover { opacity: 0.78; }

  /* Select */
  .fc-select {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    padding: 12px 38px 12px 14px;
    font-size: 15px;
    font-family: inherit;
    border-radius: var(--r-sm);
    border: 1px solid var(--border-mid);
    background: var(--surface) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' viewBox='0 0 12 7'%3E%3Cpath d='M1 1l5 4.5L11 1' stroke='%23a89880' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 14px center;
    color: var(--text);
    cursor: pointer;
    outline: none;
    box-shadow: var(--sh-sm);
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .fc-select:focus {
    border-color: var(--amber);
    box-shadow: 0 0 0 3px var(--amber-mid);
  }
`;

/* ══════════════════════════════════════════════════════════
   APP
══════════════════════════════════════════════════════════ */

export default function App() {
  const [api]    = useState(() => new Api());
  const [screen, setScreen] = useState("start");

  const [filteredCategories, setFilteredCategories] = useState([]);
  const [selectedCategory,   setSelectedCategory]   = useState(null);
  const [dueCount,           setDueCount]           = useState(0);
  const [timerSec,         setTimerSec]         = useState(5);
  const [loading,          setLoading]          = useState(true);

  const [cards,      setCards]      = useState([]);
  const [cardIdx,    setCardIdx]    = useState(0);
  const [cardState,  setCardState]  = useState("question");
  const [inserted,   setInserted]   = useState(new Set());
  const [outcomes,   setOutcomes]   = useState(new Map());
  const [totalStart, setTotalStart] = useState(0);

  const [stats, setStats] = useState(null);
  const stopTimerRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [tree, due] = await Promise.all([api.getFilteredCategoryTree(), api.getDueCards()]);
      setFilteredCategories(tree);
      setDueCount(due.length);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    api.getDueCards({ categoryId: selectedCategory ?? undefined })
      .then(d => setDueCount(d.length));
  }, [selectedCategory, loading]);

  useEffect(() => {
    if (screen !== "study" || cardState !== "question") return;
    const end = Date.now() + timerSec * 1000;
    const id  = setInterval(() => {
      if (Date.now() >= end) { clearInterval(id); setCardState("answer"); }
    }, 80);
    stopTimerRef.current = () => clearInterval(id);
    return () => clearInterval(id);
  }, [screen, cardState, cardIdx, timerSec]);

  const handleStart = async () => {
    const due = await api.getDueCards({ categoryId: selectedCategory ?? undefined });
    if (!due.length) return;
    const deck = shuffle(due);
    setCards(deck);
    setCardIdx(0);
    setCardState("question");
    setInserted(new Set());
    setOutcomes(new Map());
    setTotalStart(deck.length);
    setScreen("study");
  };

  const handleReveal = () => { stopTimerRef.current?.(); setCardState("answer"); };

  const handleNext = useCallback(() => {
    stopTimerRef.current?.();
    const card        = cards[cardIdx];
    const newCards    = [...cards];
    const newInserted = new Set(inserted);
    const newOutcomes = new Map(outcomes);

    let outcome;
    if (cardState === "question" && !inserted.has(card.id)) {
      outcome = "learned";
    } else {
      outcome = "notLearned";
      if (cardState === "answer" && !inserted.has(card.id)) {
        /* Первый провал: замешать в середину оставшихся */
        const rem = newCards.slice(cardIdx + 1);
        newCards.splice(cardIdx + 1 + Math.floor(rem.length / 2), 0, card);
        newInserted.add(card.id);
      }
    }
    newOutcomes.set(card.id, outcome);

    const nextIdx = cardIdx + 1;
    if (nextIdx >= newCards.length) { finishSession(newOutcomes); return; }

    setCards(newCards);
    setInserted(newInserted);
    setOutcomes(newOutcomes);
    setCardIdx(nextIdx);
    setCardState("question");
  }, [cards, cardIdx, cardState, inserted, outcomes]);

  const finishSession = async finalOutcomes => {
    let learned = 0, notLearned = 0;
    for (const [id, outcome] of finalOutcomes) {
      if (outcome === "learned") { learned++; await api.markCardLearned(id); }
      else                       { notLearned++; await api.markCardNotLearned(id); }
    }
    setStats({ learned, notLearned });
    setScreen("complete");
  };

  const handleReturn = async () => {
    const [tree, newDue] = await Promise.all([
      api.getFilteredCategoryTree(),
      api.getDueCards(), // без фильтра по категории — всё
    ]);
    setFilteredCategories(tree);
    setDueCount(newDue.length);
    setSelectedCategory(null); // вернуться к "Все категории"
    setScreen("start");
  };

  const learnedCount    = [...outcomes.values()].filter(v => v === "learned").length;
  const notLearnedCount = [...outcomes.values()].filter(v => v === "notLearned").length;
  const uniqueLeft      = totalStart - outcomes.size;

  if (loading) return (
    <div className="fc-root" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{CSS}</style>
      <span style={{ color:"var(--text3)", fontSize:14 }}>Загрузка...</span>
    </div>
  );

  return (
    <div className="fc-root">
      <style>{CSS}</style>
      {screen === "start" && (
        <StartScreen
          dueCount={dueCount} filteredCategories={filteredCategories}
          selectedCategory={selectedCategory} timerSec={timerSec}
          onCategory={setSelectedCategory} onTimer={setTimerSec} onStart={handleStart}
        />
      )}
      {screen === "study" && cards[cardIdx] && (
        <StudyScreen
          card={cards[cardIdx]} cardState={cardState} cardIdx={cardIdx} timerSec={timerSec}
          isRepeat={inserted.has(cards[cardIdx]?.id)}
          learnedCount={learnedCount} notLearnedCount={notLearnedCount} uniqueLeft={uniqueLeft}
          onReveal={handleReveal} onNext={handleNext}
        />
      )}
      {screen === "complete" && (
        <CompleteScreen stats={stats} onReturn={handleReturn} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   START SCREEN
══════════════════════════════════════════════════════════ */

function StartScreen({ dueCount, filteredCategories, selectedCategory, timerSec, onCategory, onTimer, onStart }) {
  const canStart = dueCount > 0;

  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:"2.5rem", display:"flex", flexDirection:"column", gap:"1.25rem" }}>

      {/* Блок статистики */}
      <div className="fc-card" style={{ padding:"2.25rem 2rem", textAlign:"center", position:"relative", overflow:"hidden" }}>
        {/* Декоративная полоска сверху */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"var(--amber)", opacity:0.7 }} />
        <div style={{ fontSize:68, fontWeight:600, lineHeight:1, color:"var(--text)", letterSpacing:"-3px", fontVariantNumeric:"tabular-nums" }}>
          {dueCount}
        </div>
        <div style={{ marginTop:10, fontSize:15, color:"var(--text2)" }}>
          {dueLabel(dueCount)}
        </div>
      </div>

      {/* Категория */}
      <div>
        <label className="fc-label">Категория</label>
        <select
          className="fc-select"
          value={selectedCategory ?? ""}
          onChange={e => onCategory(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Все категории</option>
          {filteredCategories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {'\u00a0\u00a0\u00a0\u00a0'.repeat(cat.depth)}
              {cat.depth > 0 ? '↳\u00a0' : ''}
              {cat.category}
              {'\u00a0'}({cat.count})
            </option>
          ))}
        </select>
      </div>

      {/* Таймер */}
      <div>
        <label className="fc-label">Таймер на карточку</label>
        <div style={{ display:"flex", gap:8 }}>
          {[1, 2, 5, 10].map(sec => (
            <button
              key={sec}
              onClick={() => onTimer(sec)}
              className={`fc-timer-btn${timerSec === sec ? " active" : ""}`}
              style={{ flex:1 }}
            >
              {sec}с
            </button>
          ))}
        </div>
      </div>

      {/* Старт */}
      <button
        onClick={onStart}
        disabled={!canStart}
        className="fc-btn fc-btn-primary"
        style={{ width:"100%", padding:"15px", marginTop:"0.25rem", fontSize:15 }}
      >
        {canStart ? "Начать повторение →" : "Нет карточек для повторения"}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STUDY SCREEN
══════════════════════════════════════════════════════════ */

function StudyScreen({ card, cardState, cardIdx, timerSec, isRepeat, learnedCount, notLearnedCount, uniqueLeft, onReveal, onNext }) {
  if (!card) return null;
  const showAnswer = cardState === "answer";

  return (
    <div style={{ maxWidth:480, margin:"0 auto", paddingTop:"1.75rem", display:"flex", flexDirection:"column", gap:"1rem" }}>

      {/* Прогресс */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", gap:7 }}>
          <span className="fc-chip" style={{ background:"var(--green-pale)", color:"var(--green)" }}>
            ✓&nbsp;{learnedCount}
          </span>
          {notLearnedCount > 0 && (
            <span className="fc-chip" style={{ background:"var(--amber-pale)", color:"var(--amber-text)" }}>
              ↺&nbsp;{notLearnedCount}
            </span>
          )}
        </div>
        <span style={{ fontSize:13, color:"var(--text3)" }}>осталось {uniqueLeft}</span>
      </div>

      {/* Карточка */}
      <div
        key={`card-${cardIdx}`}
        className="fc-card"
        style={{ position:"relative", overflow:"hidden", animation:"fadeUp 0.24s ease" }}
      >
        {/* Таймер-полоска (обратный progress bar) — вдоль верхнего края карточки */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:3.5, background:"var(--border)" }}>
          <div
            key={`tb-${cardIdx}`}
            style={{
              height:"100%", width:"100%",
              background:"var(--amber)",
              transformOrigin:"left center",
              animation: !showAnswer ? `timerShrink ${timerSec}s linear forwards` : "none",
              transform:  showAnswer ? "scaleX(0)" : undefined,
              transition: showAnswer ? "transform 0.25s ease" : undefined,
            }}
          />
        </div>

        <div style={{ padding:"2rem 2rem 2.25rem" }}>

          {/* Значок повтора */}
          {isRepeat && (
            <div style={{ marginBottom:14 }}>
              <span className="fc-chip" style={{ background:"var(--border)", color:"var(--text3)", fontSize:11, letterSpacing:"0.05em" }}>
                ↺ повтор
              </span>
            </div>
          )}

          {/* Вопрос */}
          <p className="fc-label">Вопрос</p>
          <p className="fc-question">{card.question}</p>

          {/* Ответ */}
          {showAnswer && (
            <div style={{ marginTop:"1.75rem", animation:"answerIn 0.22s ease" }}>
              <div style={{ height:"1px", background:"var(--border)", margin:"0 0 1.5rem" }} />
              <p className="fc-label">Ответ</p>
              <p className="fc-answer-text">{card.answer}</p>
              {card.comment && <p className="fc-comment">{card.comment}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Кнопки */}
      <div style={{ display:"flex", gap:10 }}>
        {!showAnswer ? (
          <>
            <button onClick={onReveal} className="fc-btn fc-btn-secondary" style={{ flex:1, padding:"13px 0" }}>
              Посмотреть
            </button>
            <button onClick={onNext} className="fc-btn fc-btn-primary" style={{ flex:1, padding:"13px 0" }}>
              Дальше →
            </button>
          </>
        ) : (
          <button onClick={onNext} className="fc-btn fc-btn-primary" style={{ width:"100%", padding:"15px 0" }}>
            Дальше →
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   COMPLETE SCREEN
══════════════════════════════════════════════════════════ */

function CompleteScreen({ stats, onReturn }) {
  const total   = (stats?.learned ?? 0) + (stats?.notLearned ?? 0);
  const pct     = total > 0 ? Math.round((stats.learned / total) * 100) : 0;

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:520, padding:"2rem" }}>
      <div
        className="fc-card"
        style={{ textAlign:"center", padding:"2.5rem 2rem 2rem", maxWidth:340, width:"100%", animation:"popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        {/* Иконка */}
        <div style={{
          width:60, height:60, borderRadius:"50%",
          background:"var(--green-pale)",
          display:"flex", alignItems:"center", justifyContent:"center",
          margin:"0 auto 1.5rem",
          fontSize:26, color:"var(--green)",
          boxShadow:"0 0 0 8px rgba(42,124,80,0.08)",
        }}>
          ✓
        </div>

        <h2 style={{ fontSize:22, fontWeight:600, margin:"0 0 4px", color:"var(--text)", letterSpacing:"-0.3px" }}>
          Сессия завершена
        </h2>
        <p style={{ fontSize:14, color:"var(--text2)", margin:"0 0 2rem" }}>
          Усвоено {pct}% карточек
        </p>

        {/* Статы */}
        <div style={{
          display:"flex", borderRadius:"var(--r-sm)", overflow:"hidden",
          border:"1px solid var(--border)", marginBottom:"1.75rem",
        }}>
          <div style={{ flex:1, padding:"1.1rem", borderRight:"1px solid var(--border)" }}>
            <div style={{ fontSize:40, fontWeight:700, lineHeight:1, color:"var(--green)", letterSpacing:"-1px" }}>
              {stats?.learned ?? 0}
            </div>
            <div style={{ fontSize:13, color:"var(--text2)", marginTop:6 }}>усвоено</div>
          </div>
          <div style={{ flex:1, padding:"1.1rem" }}>
            <div style={{ fontSize:40, fontWeight:700, lineHeight:1, color:"var(--amber)", letterSpacing:"-1px" }}>
              {stats?.notLearned ?? 0}
            </div>
            <div style={{ fontSize:13, color:"var(--text2)", marginTop:6 }}>на повторение</div>
          </div>
        </div>

        <button onClick={onReturn} className="fc-btn fc-btn-primary" style={{ width:"100%", padding:"14px" }}>
          Вернуться →
        </button>
      </div>
    </div>
  );
}