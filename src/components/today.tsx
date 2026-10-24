"use client";
import { useState } from "react";
import {
  ArrowRight,
  Plus,
  Sparkles,
  BookOpen,
  Bookmark,
  RotateCcw,
  Check,
  PencilLine,
} from "lucide-react";
import { useMargin } from "./context";
import { Button, Wave, Tag, ErrorBox } from "./ui";
import { localDate, relativeDate, words } from "@/lib/client";
import type { Daily, LanguageItem } from "@/lib/types";
export function Today() {
  const { data, navigate, run, busy, mutate, notify } = useMargin();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const due = data.reviewStates.filter((s) => new Date(s.due_at) <= new Date());
  const readings = data.articles.filter((a) => !a.archived);
  const current =
    readings.find((a) => a.progress > 0 && a.progress < 1) || readings[0];
  const active = data.auth.accounts.find((a) => a.id === data.auth.active);
  const daily = data.daily;
  async function collect(d: Daily["discoveries"][number]) {
    setSaving(d.term);
    try {
      await mutate("items", "POST", {
        term: d.term,
        kind: d.kind,
        meaning: d.meaning,
        examples: [{ sentence: d.example, note: d.note }],
      });
      notify("Added to your language bank");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving("");
    }
  }
  return (
    <div className="page today-page">
      <div className="page-heading">
        <h1>
          Today
          <span className="peach-dot" />
        </h1>
        <span className="date-label">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>
      {error && <ErrorBox message={error} onClose={() => setError("")} />}
      <section className="next-step">
        <div className="next-copy">
          <div className="section-title">
            <h2>
              {due.length
                ? "A few words to revisit"
                : current
                  ? "Back to your reading"
                  : "Start with a reading"}
            </h2>
            <Wave />
          </div>
          {due.length ? (
            <>
              <p>
                {new Set(due.map((s) => s.item_id)).size}{" "}
                {new Set(due.map((s) => s.item_id)).size === 1
                  ? "expression is"
                  : "expressions are"}{" "}
                ready to return to.
              </p>
              <Button onClick={() => navigate("practice", { mode: "review" })}>
                Begin review <ArrowRight size={16} />
              </Button>
            </>
          ) : current ? (
            <>
              <h3 className="reading-next-title">{current.title}</h3>
              <p>
                {current.author || `${words(current.body)} words`} ·{" "}
                {Math.max(1, Math.ceil(words(current.body) / 220))} min read
              </p>
              <Button
                onClick={() => navigate("readings", { article: current.id })}
              >
                {current.progress > 0 ? "Continue reading" : "Open reading"}
                <ArrowRight size={16} />
              </Button>
            </>
          ) : (
            <>
              <p>
                Add an article or passage you’re curious about.
                <br />
                We’ll find the language worth keeping.
              </p>
              <Button onClick={() => navigate("readings", { compose: "1" })}>
                <Plus size={16} />
                Add a reading
              </Button>
            </>
          )}
        </div>
        <div className="paper-motif" aria-hidden="true">
          <div className="motif-page">
            <span />
            <span />
            <span className="marked" />
            <span />
            <span />
          </div>
          <div className="motif-bookmark" />
        </div>
      </section>
      {!active && (
        <div className="connection-note">
          <Sparkles size={18} />
          <div>
            <strong>Your tutor is one connection away.</strong>
            <span>Use your ChatGPT plan for lessons and discoveries.</span>
          </div>
          <Button variant="secondary" onClick={() => navigate("settings")}>
            Connect ChatGPT <ArrowRight size={15} />
          </Button>
        </div>
      )}
      <section className="daily-section">
        <div className="section-title">
          <h2>A little discovery</h2>
          {daily && <span className="quiet-label">Made for today</span>}
        </div>
        {daily ? (
          <>
            <div className="discoveries">
              {daily.discoveries.map((d, i) => {
                const saved = data.items.some(
                  (item) => item.normalized === d.term.toLowerCase().trim(),
                );
                return (
                  <article className={`discovery discovery-${i}`} key={d.term}>
                    <div className="discovery-meta">
                      <Tag>{i === 0 ? "Idiom of the day" : d.title}</Tag>
                      <button
                        className="collect-icon"
                        aria-label={
                          saved ? `${d.term} collected` : `Collect ${d.term}`
                        }
                        title={saved ? "Collected" : "Collect expression"}
                        disabled={saved || saving === d.term}
                        onClick={() => collect(d)}
                      >
                        {saved ? <Check size={18} /> : <Plus size={18} />}
                      </button>
                    </div>
                    <h3>{d.term}</h3>
                    <p>{d.meaning}</p>
                    <blockquote>{d.example}</blockquote>
                    <details>
                      <summary>Usage note</summary>
                      <p>{d.note}</p>
                    </details>
                  </article>
                );
              })}
            </div>
            <button
              className="writing-prompt"
              onClick={() =>
                navigate("practice", { focus: "writing", prompt: daily.prompt })
              }
            >
              <PencilLine size={20} />
              <div>
                <strong>A small writing challenge</strong>
                <span>{daily.prompt}</span>
              </div>
              <ArrowRight size={19} />
            </button>
          </>
        ) : (
          <div className="discovery-empty">
            <div>
              <Sparkles size={22} />
              <p>
                An idiom, a useful connection, a fresh way to say it.
                <br />
                <span>Generated from your level and what you’re learning.</span>
              </p>
            </div>
            <Button
              variant="secondary"
              busy={busy}
              onClick={() => run<Daily>({ action: "daily", date: localDate() })}
            >
              Make today’s discovery <ArrowRight size={15} />
            </Button>
          </div>
        )}
      </section>
      <div className="today-bottom">
        <section>
          <div className="section-title">
            <h2>Your readings</h2>
            <button
              className="text-button"
              onClick={() => navigate("readings")}
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          {readings.length ? (
            <div className="compact-readings">
              {readings.slice(0, 3).map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate("readings", { article: a.id })}
                >
                  <BookOpen size={18} />
                  <div>
                    <strong>{a.title}</strong>
                    <span>
                      {Math.max(1, Math.ceil(words(a.body) / 220))} min ·{" "}
                      {relativeDate(a.created_at)}
                    </span>
                  </div>
                  {a.progress >= 1 ? (
                    <Check size={16} />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <button
              className="empty-line"
              onClick={() => navigate("readings", { compose: "1" })}
            >
              <BookOpen size={20} />
              <span>Your reading shelf starts here.</span>
              <Plus size={17} />
            </button>
          )}
        </section>
        <section>
          <div className="section-title">
            <h2>Worth another look</h2>
            <Bookmark size={17} />
          </div>
          {data.items.length ? (
            <div className="resurface-list">
              {[...new Set(due.map((s) => s.item_id))]
                .concat(data.items.map((i) => i.id))
                .filter((v, i, a) => a.indexOf(v) === i)
                .slice(0, 3)
                .map((id) => {
                  const item = data.items.find((i) => i.id === id)!;
                  return (
                    <button
                      key={id}
                      onClick={() => navigate("bank", { item: id })}
                    >
                      <strong>{item.term}</strong>
                      <span>{item.meaning || "Add a meaning"}</span>
                      <RotateCcw size={15} />
                    </button>
                  );
                })}
            </div>
          ) : (
            <div className="quiet-empty">
              <Bookmark size={20} />
              <p>
                Collect a word or expression.
                <br />
                It will find its way back to you here.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
