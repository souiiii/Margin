"use client";
import { useState } from "react";
import {
  Plus,
  Search,
  Bookmark,
  ArrowLeft,
  ArrowUpRight,
  Sparkles,
  Trash2,
  Check,
  ArrowRight,
  Pencil,
  Volume2,
} from "lucide-react";
import { useMargin } from "./context";
import {
  Button,
  Empty,
  Dialog,
  ErrorBox,
  Tag,
  IconButton,
  Confirm,
} from "./ui";
import type { LanguageItem, ItemKind } from "@/lib/types";
import { normalizeTerm } from "@/lib/scheduler";
export function Bank({
  itemId,
  compose = false,
  query = "",
}: {
  itemId?: string;
  compose?: boolean;
  query?: string;
}) {
  const { data, navigate } = useMargin();
  const [search, setSearch] = useState(query),
    [filter, setFilter] = useState("all");
  const item = data.items.find((i) => i.id === itemId);
  const filtered = data.items.filter(
    (i) =>
      (filter === "all" || i.kind === filter) &&
      `${i.term} ${i.meaning} ${i.note} ${i.collocations.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className={`bank-layout ${item ? "has-detail" : ""}`}>
      <section className="bank-main page">
        <div className="page-heading">
          <h1>Language bank</h1>
          <Button onClick={() => navigate("bank", { compose: "1" })}>
            <Plus size={16} />
            Add expression
          </Button>
        </div>
        <label className="search-field bank-search">
          <Search size={17} />
          <input
            aria-label="Search language bank"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="A word, a meaning, a half-remembered phrase…"
          />
        </label>
        <div className="tabs bank-tabs">
          {["all", "word", "idiom", "phrase", "construction"].map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f === "all"
                ? "Everything"
                : `${f[0].toUpperCase()}${f.slice(1)}s`}
            </button>
          ))}
        </div>
        {filtered.length ? (
          <>
            <div className="bank-list">
              {filtered.map((i) => (
                <button
                  key={i.id}
                  className={`bank-row ${itemId === i.id ? "selected" : ""}`}
                  onClick={() => navigate("bank", { item: i.id })}
                >
                  <div>
                    <strong>{i.term}</strong>
                    <span>{i.meaning || "Ready for a meaning"}</span>
                  </div>
                  <div>
                    <span className="item-kind">{i.kind}</span>
                    <ArrowRight size={16} />
                  </div>
                </button>
              ))}
            </div>
            <p className="list-count">
              {filtered.length}{" "}
              {filtered.length === 1 ? "expression" : "expressions"}
              {search && " found"}
            </p>
          </>
        ) : (
          <Empty
            symbol={<Bookmark size={30} />}
            title={search ? "It’s not here yet." : "Good language, kept close."}
            action={
              <Button
                variant="secondary"
                onClick={() => navigate("bank", { compose: "1", term: search })}
              >
                <Plus size={15} />
                Add an expression
              </Button>
            }
          >
            {search
              ? "Try another word or add the expression you’re looking for."
              : "Collect from your readings or add an expression yourself. We’ll help it become part of your English."}
          </Empty>
        )}
      </section>
      {item && <ItemDetail key={item.id} item={item} />}
      {compose && (
        <AddExpression
          initialTerm={
            typeof window !== "undefined"
              ? new URLSearchParams(window.location.search).get("term") || ""
              : ""
          }
          onClose={() => navigate("bank")}
        />
      )}
    </div>
  );
}
export function AddExpression({
  initialTerm = "",
  onClose,
}: {
  initialTerm?: string;
  onClose: () => void;
}) {
  const { run, busy, mutate, notify, navigate } = useMargin();
  const [term, setTerm] = useState(initialTerm),
    [kind, setKind] = useState<ItemKind>("word"),
    [meaning, setMeaning] = useState(""),
    [context, setContext] = useState(""),
    [generated, setGenerated] = useState<Partial<LanguageItem> | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  async function generate() {
    if (!term.trim()) return;
    const result = await run<Partial<LanguageItem>>({
      action: "define",
      term,
      context,
    });
    if (result) {
      setGenerated(result);
      setMeaning(result.meaning || "");
      setKind(result.kind || "word");
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await mutate<{ item: LanguageItem; duplicate: boolean }>(
        "items",
        "POST",
        { ...generated, term: term.trim(), kind, meaning, context },
      );
      notify(
        result.duplicate
          ? "Already in your language bank"
          : "Expression collected",
      );
      onClose();
      navigate("bank", { item: result.item.id });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog title="Keep an expression" onClose={onClose}>
      <form onSubmit={save} className="stack-form">
        {error && <ErrorBox message={error} />}
        <label>
          Word or expression
          <input
            autoFocus
            required
            maxLength={180}
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setGenerated(null);
            }}
            placeholder="Something you’d like to make your own"
          />
        </label>
        <label>
          Context <span className="optional">optional</span>
          <textarea
            rows={2}
            maxLength={3000}
            value={context}
            onChange={(e) => {
              setContext(e.target.value);
              setGenerated(null);
            }}
            placeholder="The sentence where you found it…"
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          busy={busy}
          disabled={!term.trim()}
          onClick={generate}
        >
          <Sparkles size={16} />
          {generated ? "Regenerate details" : "Explore with Margin"}
        </Button>
        <div className="form-grid compact">
          <label>
            Meaning
            <textarea
              rows={3}
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              maxLength={4000}
              placeholder="Add your meaning, or let Margin help"
            />
          </label>
          <label>
            Kind
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ItemKind)}
            >
              {["word", "idiom", "phrase", "construction"].map((k) => (
                <option value={k} key={k}>
                  {k[0].toUpperCase() + k.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {generated && (
          <div className="generated-preview">
            <Tag>{generated.register}</Tag>
            {generated.examples?.slice(0, 2).map((e, i) => (
              <p key={i}>{e.sentence}</p>
            ))}
          </div>
        )}
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={saving} disabled={!term.trim() || busy}>
            <Bookmark size={16} />
            Collect
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
function ItemDetail({ item }: { item: LanguageItem }) {
  const { data, run, busy, mutate, notify, navigate } = useMargin();
  const [note, setNote] = useState(item.note),
    [meaning, setMeaning] = useState(item.meaning),
    [editing, setEditing] = useState(false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [confirm, setConfirm] = useState(false),
    [details, setDetails] = useState<{
      explanation: string;
      example: string;
    } | null>(null);
  const source = data.articles.find((a) => a.id === item.source_article_id);
  const recognition = data.reviewStates.find(
      (s) => s.item_id === item.id && s.mode === "recognition",
    ),
    production = data.reviewStates.find(
      (s) => s.item_id === item.id && s.mode === "production",
    );
  async function enrich() {
    const result = await run<Partial<LanguageItem>>({
      action: "define",
      term: item.term,
      ...(source ? { articleId: source.id } : {}),
      context: item.context,
    });
    if (result)
      try {
        await mutate(`items/${item.id}`, "PATCH", result);
        setMeaning(result.meaning || "");
        notify("Expression details updated");
      } catch (e) {
        setError((e as Error).message);
      }
  }
  async function save() {
    setSaving(true);
    try {
      await mutate(`items/${item.id}`, "PATCH", { note, meaning });
      setEditing(false);
      notify("Saved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <aside className="item-detail">
      <div className="item-detail-toolbar">
        <button className="back-link" onClick={() => navigate("bank")}>
          <ArrowLeft size={16} />
          Language bank
        </button>
        <div className="inline-actions">
          <IconButton
            label="Edit expression"
            onClick={() => setEditing(!editing)}
          >
            <Pencil size={16} />
          </IconButton>
          <IconButton
            label="Delete expression"
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>
      {error && <ErrorBox message={error} onClose={() => setError("")} />}
      <Tag>{item.kind}</Tag>
      <div className="item-term">
        <h2>{item.term}</h2>
        <IconButton
          label={`Hear ${item.term}`}
          onClick={() => {
            if ("speechSynthesis" in window) {
              speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(item.term);
              utterance.lang = "en-US";
              utterance.rate = 0.85;
              speechSynthesis.speak(utterance);
            } else notify("Speech is not available in this browser.");
          }}
        >
          <Volume2 size={18} />
        </IconButton>
      </div>
      {editing ? (
        <label>
          Meaning
          <textarea
            value={meaning}
            rows={4}
            maxLength={4000}
            onChange={(e) => setMeaning(e.target.value)}
          />
        </label>
      ) : (
        <p className="item-meaning">
          {item.meaning ||
            "Add a meaning or explore this expression with Margin."}
        </p>
      )}
      {item.register && <p className="register-label">{item.register}</p>}
      {item.context && (
        <div className="source-context">
          <blockquote>{item.context}</blockquote>
          {source && (
            <button
              className="text-button"
              onClick={() => navigate("readings", { article: source.id })}
            >
              {source.title}
              <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      )}
      {!!item.examples.length && (
        <section>
          <h3>In use</h3>
          {item.examples.map((e, i) => (
            <div className="example" key={i}>
              <p>{e.sentence}</p>
              <small>{e.note}</small>
            </div>
          ))}
        </section>
      )}
      {!!item.collocations.length && (
        <section>
          <h3>Often with</h3>
          <div className="chips">
            {item.collocations.map((c) => (
              <Tag key={c}>{c}</Tag>
            ))}
          </div>
        </section>
      )}
      {!!item.related.length && (
        <section>
          <h3>Nearby expressions</h3>
          <div className="related-items">
            {item.related.map((r) => (
              <button
                key={r}
                onClick={() => {
                  const existing = data.items.find(
                    (i) => i.normalized === normalizeTerm(r),
                  );
                  navigate(
                    "bank",
                    existing
                      ? { item: existing.id }
                      : { compose: "1", term: r },
                  );
                }}
              >
                {r}
                <ArrowUpRight size={13} />
              </button>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3>Your note</h3>
        <textarea
          aria-label="Your note for this expression"
          rows={2}
          maxLength={4000}
          placeholder="A connection, a memory, your own example…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {(editing || note !== item.note) && (
          <Button variant="secondary" busy={saving} onClick={save}>
            <Check size={14} />
            Save changes
          </Button>
        )}
      </section>
      <section className="memory-section">
        <h3>Becoming yours</h3>
        {[
          ["Recognising", recognition],
          ["Using naturally", production],
        ].map(([label, value]) => {
          const s = value as typeof recognition;
          return (
            <div className="memory-row" key={label as string}>
              <span>{label as string}</span>
              <span>
                {!s || !s.repetitions
                  ? "Not practised"
                  : new Date(s.due_at) <= new Date()
                    ? "Ready to revisit"
                    : `Next: ${new Date(s.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
              </span>
              <div className="memory-track">
                <span
                  style={{
                    width: `${Math.min(100, ((s?.interval_days || 0) / 30) * 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </section>
      <Button variant="secondary" disabled={busy} onClick={enrich}>
        <Sparkles size={15} />
        {item.meaning ? "Refresh with Margin" : "Explore with Margin"}
      </Button>
      {item.meaning &&
        (details ? (
          <div className="expression-details">
            <p>{details.explanation}</p>
            <blockquote>{details.example}</blockquote>
          </div>
        ) : (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              const result = await run<{
                explanation: string;
                example: string;
              }>({
                action: "deeper",
                term: item.term,
                meaning: item.meaning,
                context: item.context,
              });
              if (result) setDetails(result);
            }}
          >
            Explain more
          </Button>
        ))}
      {confirm && (
        <Confirm
          title="Remove this expression?"
          description="Its review schedules and review history will also be removed. Reading highlights will stay."
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            try {
              await mutate(`items/${item.id}`, "DELETE");
              navigate("bank");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      )}
    </aside>
  );
}
