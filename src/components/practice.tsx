"use client";
import { useState, useRef, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Check,
  BookOpen,
  PenLine,
  ChevronRight,
  Trash2,
  CheckCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useMargin } from "./context";
import { Button, Empty, Tag, ErrorBox, IconButton, Wave, Confirm } from "./ui";
import { ExerciseCard, Feedback } from "./exercise";
import { relativeDate } from "@/lib/client";
import type {
  PracticeSet,
  Evaluation,
  LanguageItem,
  ReviewState,
} from "@/lib/types";
export function Practice({
  mode,
  setId,
  focus: initialFocus = "mixed",
  prompt = "",
}: {
  mode?: string;
  setId?: string;
  focus?: string;
  prompt?: string;
}) {
  const { data, navigate, run, busy } = useMargin();
  const [focus, setFocus] = useState(
      ["mixed", "vocabulary", "grammar", "writing", "word-choice"].includes(
        initialFocus,
      )
        ? initialFocus
        : "mixed",
    ),
    [count, setCount] = useState(data.settings.daily_size);
  const [brief, setBrief] = useState(prompt);
  const set = data.sets.find((s) => s.id === setId);
  const due = data.reviewStates.filter((s) => new Date(s.due_at) <= new Date());
  if (mode === "review") return <ReviewSession />;
  if (set) return <StudySet key={set.id} set={set} />;
  async function generate() {
    const result = await run<PracticeSet>({
      action: "practice",
      focus,
      count,
      brief,
    });
    if (result) navigate("practice", { set: result.id });
  }
  const sets = data.sets.filter((s) => !s.source_article_id);
  const unfinished = sets.filter((s) => !s.completed_at),
    completed = sets.filter((s) => !!s.completed_at);
  return (
    <div className="page practice-page">
      <div className="page-heading">
        <h1>Practice</h1>
        <Tag>{data.settings.level}</Tag>
      </div>
      <div className="practice-start">
        <section className="review-invitation">
          <div className="section-title">
            <h2>Bring it back</h2>
            <RotateCcw size={22} />
          </div>
          <p>
            {due.length
              ? `${due.length} ${due.length === 1 ? "review" : "reviews"} ready. A meaning to remember, a sentence to make your own.`
              : "Your collected expressions return here when it’s time to revisit them."}
          </p>
          <Button
            variant="secondary"
            disabled={!due.length}
            onClick={() => navigate("practice", { mode: "review" })}
          >
            Review expressions <ArrowRight size={16} />
          </Button>
        </section>
        <section className="practice-generator">
          <h2>A little deliberate practice</h2>
          <p>Built around your language and the things you’re working on.</p>
          <div className="practice-controls">
            <label>
              Focus
              <select value={focus} onChange={(e) => setFocus(e.target.value)}>
                <option value="mixed">A thoughtful mix</option>
                <option value="vocabulary">Vocabulary & expressions</option>
                <option value="grammar">Grammar in context</option>
                <option value="writing">Writing & sentences</option>
                <option value="word-choice">The right word</option>
              </select>
            </label>
            <label>
              Exercises
              <select value={count} onChange={(e) => setCount(+e.target.value)}>
                {[3, 5, 8].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          {focus === "writing" && (
            <label className="writing-brief">
              A prompt or topic <span className="optional">optional</span>
              <textarea
                rows={2}
                maxLength={1000}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Something you’d like to write about…"
              />
            </label>
          )}
          <Button disabled={busy} onClick={generate}>
            <Sparkles size={16} />
            Make a practice <ArrowRight size={16} />
          </Button>
        </section>
      </div>
      {(unfinished.length > 0 || completed.length > 0) && (
        <section className="practice-history">
          <div className="section-title">
            <h2>Pick up a thread</h2>
          </div>
          <div className="practice-list">
            {[...unfinished, ...completed].slice(0, 20).map((s) => {
              const answered = data.attempts.filter(
                (a) => a.set_id === s.id,
              ).length;
              return (
                <button
                  key={s.id}
                  onClick={() => navigate("practice", { set: s.id })}
                >
                  <span
                    className={`practice-list-icon ${s.completed_at ? "done" : ""}`}
                  >
                    {s.completed_at ? (
                      <CheckCheck size={21} />
                    ) : (
                      <PenLine size={21} />
                    )}
                  </span>
                  <div>
                    <strong>{s.title}</strong>
                    <span>
                      {s.payload.exercises.length} exercises ·{" "}
                      {relativeDate(s.created_at)}
                    </span>
                  </div>
                  <span className="practice-list-state">
                    {s.completed_at
                      ? "Review answers"
                      : answered
                        ? `${answered}/${s.payload.exercises.length} answered`
                        : "Begin"}
                  </span>
                  <ChevronRight size={17} />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
function StudySet({ set }: { set: PracticeSet }) {
  const { data, navigate, run, busy, mutate } = useMargin();
  const unanswered = set.payload.exercises.findIndex(
    (e) =>
      !data.attempts.some((a) => a.set_id === set.id && a.exercise_id === e.id),
  );
  const [index, setIndex] = useState(Math.max(0, unanswered));
  const [confirm, setConfirm] = useState(false),
    [error, setError] = useState("");
  const attempts = data.attempts.filter((a) => a.set_id === set.id),
    exercise = set.payload.exercises[index],
    complete = attempts.length === set.payload.exercises.length;
  const [showSummary, setShowSummary] = useState(complete);
  async function again() {
    const result = await run<PracticeSet>({
      action: "practice",
      focus: set.kind === "comprehension" ? "mixed" : set.kind,
      count: Math.max(3, Math.min(8, set.payload.exercises.length)),
      retrySetId: set.id,
    });
    if (result) navigate("practice", { set: result.id });
  }
  return (
    <div className="page study-page">
      <div className="study-top">
        <button className="back-link" onClick={() => navigate("practice")}>
          <ArrowLeft size={16} />
          Practice
        </button>
        <IconButton
          label="Delete practice set"
          onClick={() => setConfirm(true)}
        >
          <Trash2 size={16} />
        </IconButton>
      </div>
      {error && <ErrorBox message={error} />}
      <h1>{set.title}</h1>
      <div className="study-progress">
        <div className="step-track">
          {set.payload.exercises.map((e, i) => (
            <button
              aria-label={`Question ${i + 1}`}
              key={e.id}
              className={`${data.attempts.some((a) => a.set_id === set.id && a.exercise_id === e.id) ? "complete" : ""} ${i === index && !showSummary ? "current" : ""}`}
              onClick={() => {
                setIndex(i);
                setShowSummary(false);
              }}
            />
          ))}
        </div>
        <span>
          {attempts.length} / {set.payload.exercises.length}
        </span>
      </div>
      {showSummary ? (
        <div className="session-complete">
          <div className="complete-mark">
            <CheckCheck size={36} />
          </div>
          <h2>A little more yours.</h2>
          <p>You’ve worked through {set.payload.exercises.length} exercises.</p>
          <Wave />
          <div className="session-takeaways">
            {attempts
              .filter((a) => a.evaluation.misconception)
              .map((a) => (
                <p key={a.id}>
                  <RotateCcw size={16} />
                  {a.evaluation.misconception}
                </p>
              ))}
          </div>
          <div className="inline-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setIndex(0);
                setShowSummary(false);
              }}
            >
              Review answers
            </Button>
            <Button disabled={busy} onClick={again}>
              Practise these ideas again <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            set={set}
            index={index}
          />
          <div className="study-navigation">
            <Button
              variant="ghost"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              <ArrowLeft size={16} />
              Previous
            </Button>
            {index < set.payload.exercises.length - 1 ? (
              <Button variant="secondary" onClick={() => setIndex(index + 1)}>
                Next <ArrowRight size={16} />
              </Button>
            ) : complete ? (
              <Button onClick={() => setShowSummary(true)}>
                Finish practice <Check size={16} />
              </Button>
            ) : (
              <span className="muted">Answer each question to finish.</span>
            )}
          </div>
        </>
      )}
      {confirm && (
        <Confirm
          title="Delete this practice?"
          description="The exercises and their answer history will be removed."
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            try {
              await mutate(`sets/${set.id}`, "DELETE");
              navigate("practice");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      )}
    </div>
  );
}
function ReviewSession() {
  const { data, navigate, mutate, run, busy, notify } = useMargin();
  const initial = useRef(
    data.reviewStates
      .filter((s) => new Date(s.due_at) <= new Date())
      .sort(
        (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime(),
      ),
  );
  const [mode, setMode] = useState<"recognition" | "production">("recognition");
  const [finished, setFinished] = useState<string[]>([]),
    [revealed, setRevealed] = useState(false),
    [answer, setAnswer] = useState(""),
    [feedback, setFeedback] = useState<Evaluation | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const queue = initial.current.filter((s) => s.mode === mode);
  const current = queue.find(
    (s) => !finished.includes(`${s.item_id}:${s.mode}`),
  );
  const item = data.items.find((i) => i.id === current?.item_id);
  function advance() {
    if (current)
      setFinished((prev) => [...prev, `${current.item_id}:${current.mode}`]);
    setRevealed(false);
    setAnswer("");
    setFeedback(null);
    setError("");
  }
  async function rate(rating: number) {
    if (!current) return;
    setSaving(true);
    try {
      await mutate("reviews", "POST", { itemId: current.item_id, rating });
      advance();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function produce() {
    if (!item) return;
    const result = await run<{ feedback: Evaluation }>({
      action: "production",
      itemId: item.id,
      answer,
    });
    if (result) setFeedback(result.feedback);
  }
  const total = queue.length,
    done = queue.filter((s) =>
      finished.includes(`${s.item_id}:${s.mode}`),
    ).length;
  return (
    <div className="page review-page">
      <button className="back-link" onClick={() => navigate("practice")}>
        <ArrowLeft size={16} />
        Practice
      </button>
      <div className="page-heading">
        <h1>Bring it back</h1>
        <span className="quiet-label">
          {done} / {total}
        </span>
      </div>
      <div className="review-mode tabs">
        <button
          className={mode === "recognition" ? "active" : ""}
          onClick={() => {
            setMode("recognition");
            setRevealed(false);
            setAnswer("");
            setFeedback(null);
          }}
        >
          Recognise{" "}
          <span className="count">
            {initial.current.filter((s) => s.mode === "recognition").length}
          </span>
        </button>
        <button
          className={mode === "production" ? "active" : ""}
          onClick={() => {
            setMode("production");
            setRevealed(false);
            setAnswer("");
            setFeedback(null);
          }}
        >
          Use naturally{" "}
          <span className="count">
            {initial.current.filter((s) => s.mode === "production").length}
          </span>
        </button>
      </div>
      {error && <ErrorBox message={error} />}
      <div className="review-progress">
        <span style={{ width: `${total ? (done / total) * 100 : 100}%` }} />
      </div>
      {item && current ? (
        <div className="recall-card" key={`${item.id}-${mode}`}>
          <Tag>{item.kind}</Tag>
          <h2>{item.term}</h2>
          {mode === "recognition" ? (
            <>
              <p className="recall-instruction">
                What does it mean? Think of a way to use it.
              </p>
              {revealed ? (
                <div className="recall-answer">
                  <p>
                    {item.meaning ||
                      "You haven’t added a meaning yet. Explore this expression in your language bank."}
                  </p>
                  {item.examples[0] && (
                    <blockquote>{item.examples[0].sentence}</blockquote>
                  )}
                  {item.context && (
                    <details>
                      <summary>From your reading</summary>
                      <p>{item.context}</p>
                    </details>
                  )}
                  <div className="rating-buttons">
                    {[
                      ["Again", "10 min"],
                      ["Hard", "Sooner"],
                      ["Good", "On track"],
                      ["Easy", "Later"],
                    ].map(([label, hint], i) => (
                      <button
                        key={label}
                        disabled={saving}
                        onClick={() => rate(i)}
                      >
                        <strong>{label}</strong>
                        <span>{hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setRevealed(true)}>
                  Reveal meaning <ArrowRight size={16} />
                </Button>
              )}
            </>
          ) : (
            <>
              <p className="recall-instruction">
                Use this expression in a sentence of your own.
              </p>
              <textarea
                rows={4}
                maxLength={4000}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={!!feedback || busy}
                aria-label="Your sentence"
                placeholder="A sentence that sounds like you…"
              />
              {feedback ? (
                <>
                  <Feedback value={feedback} />
                  <Button onClick={advance}>
                    Next expression <ArrowRight size={16} />
                  </Button>
                </>
              ) : (
                <Button
                  disabled={answer.trim().length < 3 || busy}
                  onClick={produce}
                >
                  How does it sound? <Sparkles size={16} />
                </Button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="review-finished">
          <div className="complete-mark">
            <CheckCheck size={36} />
          </div>
          <h2>
            {total ? "That’s a good place to pause." : "Nothing due just yet."}
          </h2>
          <p>
            {total
              ? `${done} ${mode === "recognition" ? "meanings revisited" : "expressions put into words"}. They’ll return when you need them.`
              : "Your expressions will return here when it’s time."}
          </p>
          {mode === "recognition" &&
          initial.current.some(
            (s) =>
              s.mode === "production" &&
              !finished.includes(`${s.item_id}:production`),
          ) ? (
            <Button onClick={() => setMode("production")}>
              Try using them <PenLine size={16} />
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => navigate("today")}>
              Back to today <ArrowRight size={16} />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
