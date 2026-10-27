"use client";
import { useState, useEffect, useRef } from "react";
import {
  ArrowUpRight,
  Check,
  Download,
  Upload,
  Plus,
  RefreshCw,
  LogOut,
  SlidersHorizontal,
  ExternalLink,
  Database,
  ShieldCheck,
} from "lucide-react";
import { useMargin } from "./context";
import { Button, Tag, ErrorBox, Dialog, PageHeader } from "./ui";
import {
  reasoningEfforts,
  effortLabels,
  type ReasoningEffort,
} from "@/lib/reasoning";
import { api } from "@/lib/client";
import type { Model, Settings as Preferences } from "@/lib/types";
export function Settings() {
  const { data, mutate, notify, busy } = useMargin();
  const [models, setModels] = useState<Model[]>([]),
    [modelError, setModelError] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [modelLoading, setModelLoading] = useState(false),
    [importing, setImporting] = useState(false),
    [backup, setBackup] = useState<{
      data: Record<string, unknown[]>;
      format: string;
      version: number;
    } | null>(null),
    [filename, setFilename] = useState(""),
    [mode, setMode] = useState<"merge" | "replace">("merge"),
    [confirmation, setConfirmation] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const active = data.auth.accounts.find((a) => a.id === data.auth.active);
  const selectedModel =
    models.find((m) => m.slug === data.settings.model) ||
    (!data.settings.model ? models[0] : undefined);
  const supported = selectedModel?.reasoning_efforts;
  const reasoningWarning = selectedModel
    ? !supported
      ? "This model’s reasoning support is unavailable. Refresh models or choose another model."
      : [
            data.settings.everyday_reasoning,
            data.settings.advanced_reasoning,
          ].some((e) => !supported.includes(e))
        ? "A saved reasoning effort is unsupported by this model. Choose a supported setting before generating."
        : ""
    : "";
  async function loadModels(refresh = false) {
    setModelLoading(true);
    setModelError("");
    try {
      const r = await api<{ models: Model[] }>(
        `models${refresh ? "?refresh=1" : ""}`,
      );
      setModels(r.models);
    } catch (e) {
      setModelError((e as Error).message);
    } finally {
      setModelLoading(false);
    }
  }
  useEffect(() => {
    setModels([]);
    if (active?.connected && active.planEnabled) loadModels();
  }, [active?.id, active?.connected, active?.planEnabled]);
  async function update(patch: Partial<Preferences>) {
    setError("");
    setSaving(true);
    try {
      await mutate("settings", "PATCH", { ...data.settings, ...patch });
      notify("Preferences saved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function signout(id: string) {
    setSaving(true);
    try {
      const result = await mutate<{ revoked: boolean }>("accounts", "POST", {
        action: "signout",
        id,
      });
      notify(
        result.revoked
          ? "Signed out of ChatGPT"
          : "Signed out locally. Remote revocation was not confirmed; you can disconnect Margin in ChatGPT Settings.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function readBackup(file: File) {
    setError("");
    if (file.size > 250_000_000) {
      setError("Choose a Margin backup smaller than 250 MB.");
      return;
    }
    try {
      const b = JSON.parse(await file.text());
      if (
        b.format !== "margin-backup" ||
        b.version !== 1 ||
        !b.data ||
        !Array.isArray(b.data.articles) ||
        !Array.isArray(b.data.items)
      )
        throw new Error("Choose an unmodified Margin backup JSON file.");
      setBackup(b);
      setFilename(file.name);
      setConfirmation("");
      setMode("merge");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  async function restore() {
    if (!backup) return;
    setImporting(true);
    setError("");
    try {
      const r = await mutate<{ articles: number; items: number }>(
        "backup",
        "POST",
        { mode, backup, confirmation },
      );
      setBackup(null);
      notify(
        `Restored ${r.articles} readings and ${r.items} expressions. A copy of your previous library was saved locally.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }
  return (
    <div className="page settings-page">
      <PageHeader
        index="06"
        label="Your preferences"
        title="Make yourself at home"
        description="Your tutor, your pace, your space to learn."
      />
      {error && <ErrorBox message={error} onClose={() => setError("")} />}
      <section className="settings-section">
        <div className="settings-section-heading">
          <h2>Your ChatGPT connection</h2>
          {active?.connected && (
            <Tag>
              {active.planEnabled ? "Connected" : "Plan permission needed"}
            </Tag>
          )}
        </div>
        <p>
          Margin uses your ChatGPT plan for AI requests. Credentials stay on
          this Mac. No API key, and no fallback to API billing.
        </p>
        <div className="accounts-list">
          {data.auth.accounts.map((a) => (
            <div
              className={`account-row ${a.id === data.auth.active ? "active" : ""}`}
              key={a.id}
            >
              <div className="account-avatar">{a.email[0].toUpperCase()}</div>
              <div>
                <strong>{a.email}</strong>
                <span>
                  Account {a.id.slice(0, 6)}
                  {a.id === data.auth.active ? " · Active" : ""}
                  {a.needsReauth
                    ? " · Reconnect needed"
                    : !a.connected
                      ? " · Signed out"
                      : ""}
                </span>
              </div>
              <div className="inline-actions">
                {a.connected && !a.needsReauth ? (
                  <>
                    {a.id !== data.auth.active && (
                      <Button
                        variant="secondary"
                        disabled={saving || busy}
                        onClick={async () => {
                          try {
                            await mutate("accounts", "POST", {
                              action: "switch",
                              id: a.id,
                            });
                            notify("ChatGPT account changed");
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        Use account
                      </Button>
                    )}
                    <button
                      className="text-button"
                      disabled={saving}
                      onClick={() => signout(a.id)}
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </>
                ) : (
                  <a
                    className="button secondary"
                    href={`/auth/start?account=${a.id}`}
                  >
                    Reconnect
                  </a>
                )}
                {a.connected && !a.planEnabled && (
                  <a
                    className="button primary"
                    href={`/auth/start?account=${a.id}&enable=1`}
                  >
                    Enable plan usage
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="connection-actions">
          <a
            href="/auth/start"
            className={`button ${active?.connected ? "secondary" : "chatgpt-button"}`}
          >
            {active?.connected ? (
              <Plus size={16} />
            ) : (
              <img
                src="/icons/chatgpt-white.svg"
                alt=""
                width={20}
                height={20}
              />
            )}
            {active?.connected
              ? "Add ChatGPT account"
              : "Continue with ChatGPT"}
          </a>
          <a
            className="text-button"
            href="https://chatgpt.com/settings/usage"
            target="_blank"
            rel="noreferrer"
          >
            Usage & limits <ArrowUpRight size={14} />
          </a>
        </div>
        <p className="settings-footnote">
          Your ChatGPT plan and app permissions determine availability. In
          ChatGPT’s usage settings, leave additional credit use disabled if you
          want plan-only usage.
        </p>
      </section>
      <section className="settings-section">
        <div className="settings-section-heading">
          <h2>Your tutor</h2>
          {active?.connected && (
            <button
              className="text-button"
              disabled={modelLoading}
              onClick={() => loadModels(true)}
            >
              <RefreshCw size={14} className={modelLoading ? "spin" : ""} />
              Refresh models
            </button>
          )}
        </div>
        <div className="setting-row">
          <div>
            <label htmlFor="model">Model</label>
            <p>
              Available models come directly from your active ChatGPT account.
            </p>
          </div>
          <select
            id="model"
            disabled={!models.length || saving || busy}
            value={
              models.some((m) => m.slug === data.settings.model)
                ? data.settings.model
                : data.settings.model || models[0]?.slug || ""
            }
            onChange={(e) => update({ model: e.target.value })}
          >
            {data.settings.model &&
              models.length > 0 &&
              !models.some((m) => m.slug === data.settings.model) && (
                <option value={data.settings.model} disabled>
                  Saved model · unavailable
                </option>
              )}
            {models.length ? (
              models.map((m) => (
                <option value={m.slug} key={m.slug}>
                  {m.display_name}
                </option>
              ))
            ) : (
              <option>
                {modelLoading ? "Discovering models…" : "Connect ChatGPT first"}
              </option>
            )}
          </select>
        </div>
        {modelError && <ErrorBox message={modelError} />}
        <div className="tutor-reasoning form-grid">
          {(
            [
              [
                "everyday_reasoning",
                "Everyday reasoning",
                "Words, definitions & simple practice.",
              ],
              [
                "advanced_reasoning",
                "Advanced reasoning",
                "Comprehension, writing & deeper analysis.",
              ],
            ] as const
          ).map(([key, label, hint]) => (
            <label key={key} htmlFor={key}>
              {label}
              <select
                id={key}
                aria-label={label}
                disabled={
                  saving || busy || !models.length || !supported?.length
                }
                value={data.settings[key]}
                onChange={(e) =>
                  update({ [key]: e.target.value as ReasoningEffort })
                }
              >
                {reasoningEfforts.map((e) => (
                  <option key={e} value={e} disabled={!supported?.includes(e)}>
                    {effortLabels[e]}
                    {supported && !supported.includes(e)
                      ? " · unsupported"
                      : ""}
                  </option>
                ))}
              </select>
              <span className="quiet-label">{hint}</span>
            </label>
          ))}
        </div>
        {reasoningWarning && <ErrorBox message={reasoningWarning} />}

        <div className="setting-row">
          <div>
            <label htmlFor="level">Working level</label>
            <p>Guides the language, questions, and practice Margin creates.</p>
          </div>
          <select
            id="level"
            disabled={saving}
            value={data.settings.level}
            onChange={(e) =>
              update({ level: e.target.value as Preferences["level"] })
            }
          >
            <option value="B1">B1 · Intermediate</option>
            <option value="B2">B2 · Upper intermediate</option>
            <option value="C1">C1 · Advanced</option>
            <option value="C2">C2 · Proficient</option>
          </select>
        </div>
        <div className="setting-row">
          <div>
            <label htmlFor="daily-size">Practice length</label>
            <p>A comfortable number of exercises for a sitting.</p>
          </div>
          <select
            id="daily-size"
            disabled={saving}
            value={data.settings.daily_size}
            onChange={(e) => update({ daily_size: +e.target.value })}
          >
            {[3, 5, 8].map((n) => (
              <option key={n} value={n}>
                {n} exercises
              </option>
            ))}
          </select>
        </div>
      </section>
      <section className="settings-section">
        <h2>The room</h2>
        <div className="setting-row">
          <div>
            <label htmlFor="theme">Appearance</label>
            <p>A light page or a quieter evening palette.</p>
          </div>
          <select
            id="theme"
            value={data.settings.theme}
            disabled={saving}
            onChange={(e) =>
              update({ theme: e.target.value as Preferences["theme"] })
            }
          >
            <option value="light">Daylight</option>
            <option value="dark">After hours</option>
          </select>
        </div>
      </section>
      <section className="settings-section">
        <div className="settings-section-heading">
          <h2>Your library, safely kept</h2>
          <Tag>{data.storage}</Tag>
        </div>
        <p>
          Back up readings, highlights, expressions, exercises, and learning
          history. Backups include a checksum and exclude sign-in credentials.
        </p>
        <div className="inline-actions backup-actions">
          <a href="/api/backup" download className="button secondary">
            <Download size={16} />
            Export library
          </a>
          <Button
            variant="secondary"
            disabled={importing || busy}
            onClick={() => input.current?.click()}
          >
            <Upload size={16} />
            Import backup
          </Button>
          <input
            ref={input}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) readBackup(f);
            }}
          />
        </div>
        <p className="settings-footnote">
          An automatic snapshot is saved before every import. Local data lives
          in <code>.margin/</code> unless a different data directory is
          configured.
        </p>
      </section>
      <footer className="settings-footer">
        <span className="brand-small">margin</span>
        <span>Made for your English.</span>
        <a
          href="https://developers.openai.com/siwc/token-sharing-open-source"
          target="_blank"
          rel="noreferrer"
        >
          ChatGPT integration <ExternalLink size={12} />
        </a>
      </footer>
      {backup && (
        <Dialog
          title="Bring your library back"
          onClose={() => !importing && setBackup(null)}
        >
          <p className="muted">{filename}</p>
          <div className="backup-summary">
            <span>
              <strong>{backup.data.articles.length}</strong> readings
            </span>
            <span>
              <strong>{backup.data.items.length}</strong> expressions
            </span>
          </div>
          {error && <ErrorBox message={error} />}
          <label>
            Restore method
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="merge">Merge into this library</option>
              <option value="replace">Replace this library</option>
            </select>
          </label>
          <p className="muted small-copy">
            {mode === "merge"
              ? "Matching record IDs are updated. New records are added. Your current library is also saved as a local snapshot."
              : "Your current learning library will be replaced with this backup. A local snapshot is saved first. ChatGPT connections are kept."}
          </p>
          {mode === "replace" && (
            <label>
              Type REPLACE to confirm
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
              />
            </label>
          )}
          <div className="form-actions">
            <Button
              variant="ghost"
              disabled={importing}
              onClick={() => setBackup(null)}
            >
              Cancel
            </Button>
            <Button
              busy={importing}
              disabled={mode === "replace" && confirmation !== "REPLACE"}
              onClick={restore}
            >
              <Upload size={16} />
              Restore library
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
