"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Search,
  BookOpen,
  Check,
  Sparkles,
  Bookmark,
  Highlighter,
  MessageSquare,
  Trash2,
  Archive,
  PanelRightClose,
  PanelRightOpen,
  Type,
  Save,
  X,
  Pencil,
} from "lucide-react";
import { useMargin } from "./context";
import { Button, IconButton, Empty, ErrorBox, Tag, Confirm, Wave } from "./ui";
import { ExerciseCard } from "./exercise";
import { api, words, relativeDate } from "@/lib/client";
import type {
  Article,
  Annotation,
  LanguageItem,
  PracticeSet,
  ItemKind,
  Level,
} from "@/lib/types";
interface Suggestion {
  term: string;
  quote: string;
  kind: ItemKind;
  meaning: string;
  reason: string;
}
export function Readings({
  articleId,
  compose,
}: {
  articleId?: string;
  compose?: boolean;
}) {
  const { data, navigate } = useMargin();
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  const article = data.articles.find((a) => a.id === articleId);
  if (compose) return <ReadingEditor />;
  if (article) return <Reader key={article.id} article={article} />;
  const filtered = data.articles.filter(
    (a) =>
      a.archived === archived &&
      `${a.title} ${a.author} ${a.body}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="page">
      <div className="page-heading">
        <h1>Readings</h1>
        <Button onClick={() => navigate("readings", { compose: "1" })}>
          <Plus size={16} />
          Add reading
        </Button>
      </div>
      <div className="list-toolbar">
        <div className="tabs">
          <button
            className={!archived ? "active" : ""}
            onClick={() => setArchived(false)}
          >
            Your shelf
          </button>
          <button
            className={archived ? "active" : ""}
            onClick={() => setArchived(true)}
          >
            Archive
          </button>
        </div>
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search readings"
            placeholder="Find a reading…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {filtered.length ? (
        <div className="reading-list">
          {filtered.map((a) => (
            <button
              className="reading-row"
              key={a.id}
              onClick={() => navigate("readings", { article: a.id })}
            >
              <span className="reading-icon">
                <BookOpen size={23} />
              </span>
              <div>
                <h2>{a.title}</h2>
                <p>{a.body.slice(0, 160).replace(/\n/g, " ")}</p>
                <span className="reading-row-meta">
                  {a.author && `${a.author} · `}
                  {Math.max(1, Math.ceil(words(a.body) / 220))} min read ·{" "}
                  {relativeDate(a.created_at)}
                </span>
              </div>
              <span
                className={`reading-state ${a.progress >= 1 ? "finished" : ""}`}
              >
                {a.progress >= 1 ? (
                  <>
                    <Check size={14} />
                    Read
                  </>
                ) : a.progress > 0 ? (
                  `${Math.round(a.progress * 100)}%`
                ) : (
                  "Unread"
                )}
              </span>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
      ) : (
        <Empty
          symbol={<BookOpen size={32} />}
          title={
            search
              ? "No readings match."
              : archived
                ? "Your archive is empty."
                : "Make room for a good read."
          }
          action={
            !search && !archived ? (
              <Button onClick={() => navigate("readings", { compose: "1" })}>
                <Plus size={16} />
                Add your first reading
              </Button>
            ) : undefined
          }
        >
          {search
            ? "Try another title, author, or phrase."
            : archived
              ? "Archived readings will stay available here."
              : "Bring an article, an essay, or a passage. The interesting language starts with what interests you."}
        </Empty>
      )}
    </div>
  );
}
function ReadingEditor({
  article,
  onClose,
}: {
  article?: Article;
  onClose?: () => void;
}) {
  const { mutate, navigate, notify } = useMargin();
  const [title, setTitle] = useState(article?.title || ""),
    [body, setBody] = useState(article?.body || ""),
    [author, setAuthor] = useState(article?.author || ""),
    [url, setUrl] = useState(article?.source_url || ""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const [metadata, setMetadata] = useState(
    !!article?.author || !!article?.source_url,
  );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const saved = await mutate<Article>(
        article ? `articles/${article.id}` : "articles",
        article ? "PATCH" : "POST",
        { title, body, author, source_url: url },
      );
      notify(article ? "Reading updated" : "Added to your shelf");
      if (onClose) onClose();
      else navigate("readings", { article: saved.id });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="page composer-page">
      <button
        className="back-link"
        onClick={() => (onClose ? onClose() : navigate("readings"))}
      >
        <ArrowLeft size={16} />
        Readings
      </button>
      <div className="page-heading">
        <h1>{article ? "Edit reading" : "A new reading"}</h1>
      </div>
      <form onSubmit={save} className="reading-composer">
        {error && <ErrorBox message={error} />}
        <label>
          Title
          <input
            autoFocus
            required
            maxLength={300}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your reading a title"
          />
        </label>
        <label>
          Passage
          <textarea
            required
            minLength={20}
            maxLength={80000}
            rows={16}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Paste the text you’d like to read…"
            className="passage-input"
          />
        </label>
        <div className="composer-meta">
          <span>{words(body).toLocaleString()} words</span>
          <button
            type="button"
            className="text-button"
            onClick={() => setMetadata(!metadata)}
          >
            {metadata ? "Hide details" : "Add author or source"}
          </button>
        </div>
        {metadata && (
          <div className="form-grid">
            <label>
              Author <span className="optional">optional</span>
              <input
                maxLength={200}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author’s name"
              />
            </label>
            <label>
              Source URL <span className="optional">optional</span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </label>
          </div>
        )}
        <div className="form-actions">
          <Button
            type="button"
            variant="ghost"
            onClick={() => (onClose ? onClose() : navigate("readings"))}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            busy={saving}
            disabled={!title.trim() || body.trim().length < 20}
          >
            <BookOpen size={16} />
            {article ? "Save changes" : "Save & read"}
          </Button>
        </div>
      </form>
    </div>
  );
}
function Reader({ article }: { article: Article }) {
  const { data, navigate, run, busy, mutate, notify } = useMargin();
  const [rail, setRail] = useState(true),
    [tab, setTab] = useState<"language" | "notes">("language"),
    [suggestions, setSuggestions] = useState<Suggestion[] | null>(null),
    [selection, setSelection] = useState<{
      text: string;
      start: number;
      end: number;
      x: number;
      y: number;
    } | null>(null),
    [definition, setDefinition] = useState<Partial<LanguageItem> | null>(null),
    [definitionSource, setDefinitionSource] = useState<{
      quote: string;
      start: number;
    } | null>(null),
    [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(
      null,
    ),
    [note, setNote] = useState(""),
    [fontSize, setFontSize] = useState(20),
    [difficulty, setDifficulty] = useState<Level>(data.settings.level),
    [questionType, setQuestionType] = useState("mixed"),
    [count, setCount] = useState(3),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [editing, setEditing] = useState(false),
    [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const selections = data.annotations.filter(
    (a) => a.article_id === article.id,
  );
  const sets = data.sets.filter((s) => s.source_article_id === article.id);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let progress = article.progress;
    const main = document.querySelector(".workspace-scroll");
    const onScroll = () => {
      if (!bodyRef.current) return;
      const rect = bodyRef.current.getBoundingClientRect();
      const height = main?.clientHeight || window.innerHeight;
      const ratio = Math.min(
        0.98,
        Math.max(0, (height - rect.top) / (rect.height || 1)),
      );
      if (ratio > progress + 0.04) {
        progress = ratio;
        clearTimeout(timer);
        timer = setTimeout(() => {
          api(`articles/${article.id}`, {
            method: "PATCH",
            body: JSON.stringify({ progress }),
          }).catch(() => {});
        }, 1200);
      }
    };
    main?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      main?.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, [article.id]);
  function capture() {
    const s = window.getSelection();
    if (!s || s.isCollapsed || !s.rangeCount || !bodyRef.current) {
      setSelection(null);
      return;
    }
    const r = s.getRangeAt(0);
    if (!bodyRef.current.contains(r.commonAncestorContainer)) {
      setSelection(null);
      return;
    }
    const text = s.toString().trim();
    if (!text || text.length > 5000) return;
    const before = r.cloneRange();
    before.selectNodeContents(bodyRef.current);
    before.setEnd(r.startContainer, r.startOffset);
    const start =
      before.toString().length +
      (s.toString().length - s.toString().trimStart().length);
    const rect = r.getBoundingClientRect();
    setSelection({
      text,
      start,
      end: start + text.length,
      x: Math.max(12, Math.min(window.innerWidth - 290, rect.left)),
      y: Math.max(10, rect.top - 48),
    });
    setDefinition(null);
    setSelectedSuggestion(null);
    setNote("");
  }
  async function highlight() {
    if (!selection) return;
    setSaving(true);
    try {
      await mutate("annotations", "POST", {
        article_id: article.id,
        start_offset: selection.start,
        end_offset: selection.end,
        quote: selection.text,
        note,
      });
      setRail(true);
      setTab("notes");
      setSelection(null);
      window.getSelection()?.removeAllRanges();
      notify("Highlight saved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function defineSelection() {
    if (!selection) return;
    setRail(true);
    setTab("language");
    const term = selection.text;
    const source = { quote: selection.text, start: selection.start };
    const result = await run<Partial<LanguageItem>>({
      action: "define",
      term,
      articleId: article.id,
      context: selection.text,
    });
    if (result) {
      setDefinition({ ...result, term });
      setDefinitionSource(source);
    }
  }
  async function defineSuggestion(s: Suggestion) {
    setRail(true);
    setTab("language");
    setSelection(null);
    setDefinition(null);
    setSelectedSuggestion(s);
    const result = await run<Partial<LanguageItem>>({
      action: "define",
      term: s.term,
      articleId: article.id,
      context: s.quote,
    });
    if (result) {
      setDefinition({ ...result, term: s.term });
      setDefinitionSource({
        quote: s.quote,
        start: article.body.indexOf(s.quote),
      });
    }
  }
  async function collect() {
    if (!definition) return;
    setSaving(true);
    try {
      const context = definitionSource?.quote || "";
      const result = await mutate<{ item: LanguageItem; duplicate: boolean }>(
        "items",
        "POST",
        { ...definition, source_article_id: article.id, context, note },
      );
      const offset = definitionSource?.start ?? article.body.indexOf(context);
      if (
        context &&
        offset >= 0 &&
        !selections.some(
          (s) =>
            s.start_offset === offset &&
            s.end_offset === offset + context.length,
        )
      )
        await mutate("annotations", "POST", {
          article_id: article.id,
          start_offset: offset,
          end_offset: offset + context.length,
          quote: context,
          item_id: result.item.id,
        });
      notify(
        result.duplicate
          ? "Already in your language bank"
          : "Collected — it’ll return in review",
      );
      setDefinition(null);
      setSelection(null);
      setSelectedSuggestion(null);
      window.getSelection()?.removeAllRanges();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function analyze() {
    const result = await run<{ selections: Suggestion[] }>({
      action: "analyze",
      articleId: article.id,
    });
    if (result) {
      setSuggestions(result.selections);
      setRail(true);
      setTab("language");
    }
  }
  async function questions() {
    await run<PracticeSet>({
      action: "questions",
      articleId: article.id,
      difficulty,
      questionType,
      count,
    });
  }
  async function update(patch: Partial<Article>) {
    try {
      await mutate(`articles/${article.id}`, "PATCH", patch);
      notify(patch.archived ? "Reading archived" : "Reading updated");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (editing)
    return (
      <ReadingEditor article={article} onClose={() => setEditing(false)} />
    );
  const cuts = [
    ...new Set([
      0,
      article.body.length,
      ...selections.flatMap((s) => [s.start_offset, s.end_offset]),
    ]),
  ].sort((a, b) => a - b);
  return (
    <div className={`reader-layout ${rail ? "with-rail" : ""}`}>
      <div className="reader-toolbar">
        <button className="back-link" onClick={() => navigate("readings")}>
          <ArrowLeft size={17} />
          <span>Readings</span>
        </button>
        <div className="inline-actions">
          <IconButton
            label="Decrease reading size"
            disabled={fontSize <= 17}
            onClick={() => setFontSize(fontSize - 1)}
          >
            <Type size={14} />
          </IconButton>
          <IconButton
            label="Increase reading size"
            disabled={fontSize >= 26}
            onClick={() => setFontSize(fontSize + 1)}
          >
            <Type size={20} />
          </IconButton>
          <span className="toolbar-divider" />
          <Button variant="ghost" disabled={busy} onClick={analyze}>
            <Sparkles size={16} />
            <span>Notice language</span>
          </Button>
          <IconButton
            label={rail ? "Close reading notes" : "Open reading notes"}
            onClick={() => setRail(!rail)}
          >
            {rail ? (
              <PanelRightClose size={19} />
            ) : (
              <PanelRightOpen size={19} />
            )}
          </IconButton>
        </div>
      </div>
      <div className="reading-column">
        {error && <ErrorBox message={error} onClose={() => setError("")} />}
        <header className="article-header">
          <h1>{article.title}</h1>
          <div className="article-meta">
            {article.author && <span>{article.author}</span>}
            <span>
              {Math.max(1, Math.ceil(words(article.body) / 220))} min read
            </span>
            {article.source_url && (
              <a href={article.source_url} target="_blank" rel="noreferrer">
                Original source ↗
              </a>
            )}
          </div>
          <Wave />
        </header>
        <div
          className="article-body"
          ref={bodyRef}
          style={{ fontSize }}
          onMouseUp={capture}
          onKeyUp={capture}
          onTouchEnd={() => setTimeout(capture, 0)}
        >
          {cuts.slice(0, -1).map((start, i) => {
            const end = cuts[i + 1],
              a = selections.find(
                (a) => a.start_offset <= start && a.end_offset >= end,
              );
            const text = article.body.slice(start, end);
            return a ? (
              <mark
                key={start}
                className={a.item_id ? "collected-mark" : ""}
                title={a.note || "Saved highlight"}
                onClick={() => {
                  setRail(true);
                  setTab("notes");
                }}
              >
                {text}
              </mark>
            ) : (
              <span key={start}>{text}</span>
            );
          })}
        </div>
        <div className="article-end">
          <Button
            variant="secondary"
            disabled={article.progress >= 1}
            onClick={() => update({ progress: 1 })}
          >
            <Check size={16} />
            {article.progress >= 1 ? "Reading finished" : "Mark as read"}
          </Button>
          <div className="inline-actions">
            <IconButton label="Edit reading" onClick={() => setEditing(true)}>
              <Pencil size={16} />
            </IconButton>
            <IconButton
              label={article.archived ? "Restore reading" : "Archive reading"}
              onClick={() => update({ archived: !article.archived })}
            >
              <Archive size={17} />
            </IconButton>
            <IconButton label="Delete reading" onClick={() => setConfirm(true)}>
              <Trash2 size={16} />
            </IconButton>
          </div>
        </div>
        <section className="comprehension-section">
          <div className="section-title">
            <h2>Between the lines</h2>
            <MessageSquare size={19} />
          </div>
          <p className="section-intro">
            Stay with the reading a little longer.
          </p>
          <div className="question-controls">
            <label>
              <span>Level</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Level)}
              >
                {["B1", "B2", "C1", "C2"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Questions</span>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
              >
                <option value="mixed">A mix</option>
                <option value="short-answer">Short answer</option>
                <option value="multiple-choice">Multiple choice</option>
                <option value="rewrite">Rewrite</option>
              </select>
            </label>
            <label>
              <span>How many</span>
              <select value={count} onChange={(e) => setCount(+e.target.value)}>
                {[1, 3, 5, 8].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <Button disabled={busy} onClick={questions}>
              <Sparkles size={15} />
              {sets.length ? "More questions" : "Make questions"}
            </Button>
          </div>
          {sets.map((s) => (
            <div className="question-set" key={s.id}>
              <div className="question-set-heading">
                <h3>{s.title}</h3>
                <span>
                  {
                    s.payload.exercises.filter((e) =>
                      data.attempts.some(
                        (a) => a.set_id === s.id && a.exercise_id === e.id,
                      ),
                    ).length
                  }
                  /{s.payload.exercises.length} answered
                </span>
              </div>
              {s.payload.exercises.map((e, i) => (
                <ExerciseCard
                  key={e.id}
                  exercise={e}
                  set={s}
                  index={i}
                  inline
                />
              ))}
            </div>
          ))}
        </section>
      </div>
      {rail && (
        <aside className="reading-rail">
          <div className="rail-tabs tabs">
            <button
              className={tab === "language" ? "active" : ""}
              onClick={() => setTab("language")}
            >
              Language
            </button>
            <button
              className={tab === "notes" ? "active" : ""}
              onClick={() => setTab("notes")}
            >
              Notes{" "}
              {selections.length > 0 && (
                <span className="count">{selections.length}</span>
              )}
            </button>
          </div>
          {tab === "language" ? (
            <>
              {definition ? (
                <div className="definition-preview">
                  <button
                    className="back-link"
                    onClick={() => {
                      setDefinition(null);
                      setSelectedSuggestion(null);
                    }}
                  >
                    <ArrowLeft size={14} />
                    Discoveries
                  </button>
                  <Tag>{definition.kind}</Tag>
                  <h2>{definition.term}</h2>
                  <p>{definition.meaning}</p>
                  {definition.register && (
                    <span className="register-label">
                      {definition.register}
                    </span>
                  )}
                  <h3>In use</h3>
                  {definition.examples?.map((e, i) => (
                    <div key={i} className="example">
                      <p>{e.sentence}</p>
                      <small>{e.note}</small>
                    </div>
                  ))}
                  {!!definition.collocations?.length && (
                    <>
                      <h3>Often with</h3>
                      <div className="chips">
                        {definition.collocations.map((c) => (
                          <Tag key={c}>{c}</Tag>
                        ))}
                      </div>
                    </>
                  )}
                  <Button busy={saving} onClick={collect}>
                    <Bookmark size={16} />
                    Collect expression
                  </Button>
                </div>
              ) : suggestions ? (
                <div className="suggestions-list">
                  {suggestions.length === 0 ? (
                    <p className="muted rail-hint">
                      No especially useful expressions stood out at your current
                      level. You can still select anything you’d like to
                      explore.
                    </p>
                  ) : (
                    <>
                      <p className="rail-hint">A few things worth noticing.</p>
                      {suggestions.map((s) => (
                        <button
                          key={s.quote}
                          className="suggestion"
                          onClick={() => defineSuggestion(s)}
                          disabled={busy}
                        >
                          <span className="suggestion-head">
                            <strong>{s.term}</strong>
                            <Plus size={15} />
                          </span>
                          <span>{s.meaning}</span>
                          <small>{s.reason}</small>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="rail-empty">
                  <Highlighter size={26} />
                  <h3>Follow your curiosity.</h3>
                  <p>
                    Select a word or phrase to explore it, or let Margin notice
                    a few useful expressions.
                  </p>
                  <Button variant="secondary" disabled={busy} onClick={analyze}>
                    <Sparkles size={15} />
                    Notice language
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="notes-list">
              {selections.length ? (
                selections.map((a) => <Note key={a.id} annotation={a} />)
              ) : (
                <div className="rail-empty">
                  <MessageSquare size={25} />
                  <h3>Think in the margins.</h3>
                  <p>
                    Select a passage and choose Highlight. Add your thoughts
                    here.
                  </p>
                </div>
              )}
            </div>
          )}
        </aside>
      )}
      {selection && (
        <div
          className="selection-toolbar"
          style={{ left: selection.x, top: selection.y }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button disabled={saving} onClick={highlight}>
            <Highlighter size={15} />
            Highlight
          </button>
          {selection.text.length <= 180 && (
            <button disabled={busy} onClick={defineSelection}>
              <Sparkles size={15} />
              Explore
            </button>
          )}
          <button
            aria-label="Dismiss selection"
            onClick={() => setSelection(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {confirm && (
        <Confirm
          title="Delete this reading?"
          description="Its highlights and notes will be removed. Collected expressions and practice history will stay in your library."
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            try {
              await mutate(`articles/${article.id}`, "DELETE");
              navigate("readings");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      )}
    </div>
  );
}
function Note({ annotation: a }: { annotation: Annotation }) {
  const { mutate, notify } = useMargin();
  const [note, setNote] = useState(a.note),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  async function save() {
    if (note === a.note) return;
    setSaving(true);
    try {
      await mutate(`annotations/${a.id}`, "PATCH", { note });
      notify("Note saved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="annotation-note">
      <blockquote>{a.quote}</blockquote>
      <textarea
        aria-label={`Note on ${a.quote.slice(0, 40)}`}
        placeholder="Add a thought…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={4000}
      />
      {error && <ErrorBox message={error} />}
      <div className="note-actions">
        <Button
          variant="ghost"
          busy={saving}
          disabled={note === a.note}
          onClick={save}
        >
          <Save size={13} />
          Save note
        </Button>
        <IconButton
          label="Remove highlight"
          onClick={async () => {
            try {
              await mutate(`annotations/${a.id}`, "DELETE");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <Trash2 size={14} />
        </IconButton>
      </div>
    </div>
  );
}
