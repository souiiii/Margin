"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sun,
  BookOpen,
  Bookmark,
  PenLine,
  TrendingUp,
  Settings as SettingsIcon,
  Search,
  Menu,
  X,
  ArrowRight,
  ChevronDown,
  Check,
} from "lucide-react";
import { api, localDate } from "@/lib/client";
import type { AppState, Model } from "@/lib/types";
import { MarginProvider, useMargin } from "./context";
import { Today } from "./today";
import { Readings } from "./readings";
import { Bank } from "./bank";
import { Practice } from "./practice";
import { Progress } from "./progress";
import { Settings } from "./settings";
import { Brand, Button, Dialog, IconButton, ErrorBox } from "./ui";
const nav = [
  { id: "today", label: "Today", icon: Sun },
  { id: "readings", label: "Readings", icon: BookOpen },
  { id: "bank", label: "Language bank", icon: Bookmark },
  { id: "practice", label: "Practice", icon: PenLine },
  { id: "progress", label: "Progress", icon: TrendingUp },
];
export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Boot />
    </Suspense>
  );
}
function Loading() {
  return (
    <div className="boot-screen">
      <div className="brand">
        <Brand />
      </div>
      <div className="boot-lines">
        <span />
        <span />
        <span />
      </div>
      <p>Opening your library…</p>
    </div>
  );
}
function Boot() {
  const [initial, setInitial] = useState<AppState | null>(null),
    [error, setError] = useState("");
  const router = useRouter();
  const load = useCallback(async () => {
    setError("");
    try {
      setInitial(await api<AppState>(`state?date=${localDate()}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const navigate = useCallback(
    (view: string, params?: Record<string, string>) => {
      const q = new URLSearchParams({ view, ...params });
      router.push(`/?${q}`);
    },
    [router],
  );
  if (error)
    return (
      <div className="boot-screen">
        <div className="brand">
          <Brand />
        </div>
        <ErrorBox message={error} />
        <Button onClick={load}>Try again</Button>
      </div>
    );
  if (!initial) return <Loading />;
  return (
    <MarginProvider initial={initial} navigate={navigate}>
      <Shell />
    </MarginProvider>
  );
}
function Shell() {
  const { data, navigate, refresh, notify } = useMargin();
  const params = useSearchParams();
  const [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(false);
  const view = params.get("view") || "today";
  const main = useRef<HTMLElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const [authMessage, setAuthMessage] = useState("");
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);
  useEffect(() => {
    setMobile(false);
    main.current?.scrollTo({ top: 0 });
  }, [params]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMobile(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const trigger = document.activeElement as HTMLElement | null;
    const panel = sidebar.current;
    const focusFrame = requestAnimationFrame(() => {
      panel?.querySelector<HTMLButtonElement>(".mobile-close")?.focus();
    });
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !panel) return;
      const controls = panel.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      );
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    panel?.addEventListener("keydown", trapFocus);
    return () => {
      cancelAnimationFrame(focusFrame);
      panel?.removeEventListener("keydown", trapFocus);
      trigger?.focus();
    };
  }, [mobile]);
  useEffect(() => {
    const message = params.get("auth_error");
    if (message)
      setAuthMessage(
        message === "start"
          ? "ChatGPT sign-in could not start. Please try again."
          : message,
      );
    if (params.get("connected"))
      notify("ChatGPT connected. Your tutor is ready.");
  }, []);
  useEffect(() => {
    function keyboard(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      }
      if (e.key === "Escape") setMobile(false);
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  useEffect(() => {
    const onFocus = () => refresh().catch(() => {});
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  const due = data.reviewStates.filter(
    (s) => new Date(s.due_at) <= new Date(),
  ).length;
  const active = data.auth.accounts.find((a) => a.id === data.auth.active);
  const title =
    nav.find((n) => n.id === view)?.label ||
    (view === "settings" ? "Settings" : "Today");
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        Skip to content
      </a>
      {mobile && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        ref={sidebar}
        id="main-navigation"
        className={`sidebar ${mobile ? "open" : ""}`}
      >
        <div className="sidebar-top">
          <button
            className="brand"
            aria-label="Margin home"
            onClick={() => navigate("today")}
          >
            <Brand />
          </button>
          <IconButton
            className="mobile-close"
            label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </IconButton>
        </div>
        <button className="global-search" onClick={() => setSearch(true)}>
          <Search size={16} />
          <span>Find anything</span>
          <kbd>⌘ K</kbd>
        </button>
        <p className="nav-label">Your workspace</p>
        <nav aria-label="Main navigation">
          {nav.map((n, index) => (
            <button
              key={n.id}
              className={`nav-item ${view === n.id ? "active" : ""}`}
              onClick={() => navigate(n.id)}
              aria-label={n.label}
              aria-current={view === n.id ? "page" : undefined}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              <span
                className={`nav-index ${n.id === "practice" && due > 0 ? "has-due" : ""}`}
                aria-hidden="true"
              >
                {n.id === "practice" && due > 0 ? due : `0${index + 1}`}
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${view === "settings" ? "active" : ""}`}
            aria-current={view === "settings" ? "page" : undefined}
            onClick={() => navigate("settings")}
          >
            <SettingsIcon size={19} />
            <span>Settings</span>
            <span className="nav-index" aria-hidden="true">
              06
            </span>
          </button>
          <div className="local-status">
            <span />
            Personal learning space
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <IconButton
              className="menu-button"
              label="Open navigation"
              aria-expanded={mobile}
              aria-controls="main-navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </IconButton>
            <span className="breadcrumb-root">Workspace</span>
            <span className="breadcrumb-divider" aria-hidden="true">
              /
            </span>
            <span>{title}</span>
          </div>
          <div className="topbar-right">
            {active?.connected && active.planEnabled ? (
              <ModelPicker />
            ) : (
              <button
                className="connect-top"
                onClick={() => navigate("settings")}
              >
                <span className="connection-dot" />
                <span>Connect ChatGPT</span>
                <ArrowRight size={13} />
              </button>
            )}
            <button
              className="account-button"
              aria-label="Open account settings"
              onClick={() => navigate("settings")}
            >
              {active?.connected ? active.email[0].toUpperCase() : "M"}
            </button>
          </div>
        </header>
        <main
          className="workspace-scroll"
          ref={main}
          id="workspace"
          tabIndex={-1}
        >
          {authMessage && (
            <div className="auth-message">
              <ErrorBox
                message={authMessage}
                onClose={() => setAuthMessage("")}
              />
            </div>
          )}
          {view === "readings" ? (
            <Readings
              articleId={params.get("article") || undefined}
              compose={params.get("compose") === "1"}
            />
          ) : view === "bank" ? (
            <Bank
              itemId={params.get("item") || undefined}
              compose={params.get("compose") === "1"}
              query={params.get("q") || ""}
            />
          ) : view === "practice" ? (
            <Practice
              mode={params.get("mode") || undefined}
              setId={params.get("set") || undefined}
              focus={params.get("focus") || undefined}
              prompt={params.get("prompt") || ""}
            />
          ) : view === "progress" ? (
            <Progress />
          ) : view === "settings" ? (
            <Settings />
          ) : (
            <Today />
          )}
        </main>
      </div>
      {search && <SearchDialog onClose={() => setSearch(false)} />}
    </div>
  );
}
function ModelPicker() {
  const { data, mutate, notify } = useMargin();
  const [models, setModels] = useState<Model[]>([]),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setModels([]);
    setError("");
    api<{ models: Model[] }>("models")
      .then((r) => setModels(r.models))
      .catch((e) => setError(e.message));
  }, [data.auth.active]);
  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  const selected =
    models.find((m) => m.slug === data.settings.model) || models[0];
  return (
    <div className="model-picker" ref={ref}>
      <button
        className="model-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="connection-dot connected" />
        {selected?.display_name || "ChatGPT"}
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="model-menu">
          <span className="quiet-label">Your ChatGPT models</span>
          {error ? (
            <p className="model-error">{error}</p>
          ) : models.length ? (
            models.map((m) => (
              <button
                key={m.slug}
                onClick={async () => {
                  try {
                    await mutate("settings", "PATCH", {
                      ...data.settings,
                      model: m.slug,
                    });
                    setOpen(false);
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                <span>{m.display_name}</span>
                {selected?.slug === m.slug && <Check size={15} />}
              </button>
            ))
          ) : (
            <p>Discovering models…</p>
          )}
        </div>
      )}
    </div>
  );
}
function SearchDialog({ onClose }: { onClose: () => void }) {
  const { data, navigate } = useMargin();
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();
  const results = q
    ? [
        ...data.articles
          .filter((a) => `${a.title} ${a.body}`.toLowerCase().includes(q))
          .slice(0, 4)
          .map((a) => ({
            id: a.id,
            title: a.title,
            detail: "Reading",
            view: "readings",
            params: { article: a.id },
          })),
        ...data.items
          .filter((i) =>
            `${i.term} ${i.meaning} ${i.note}`.toLowerCase().includes(q),
          )
          .slice(0, 6)
          .map((i) => ({
            id: i.id,
            title: i.term,
            detail: i.meaning || i.kind,
            view: "bank",
            params: { item: i.id },
          })),
      ]
    : [];
  return (
    <Dialog title="Find in Margin" onClose={onClose}>
      <label className="search-field command-search">
        <Search size={19} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="A reading, a word, a thought…"
          aria-label="Find in Margin"
        />
      </label>
      <div className="search-results">
        {results.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              onClose();
              navigate(r.view, r.params);
            }}
          >
            <div>
              <strong>{r.title}</strong>
              <span>{r.detail}</span>
            </div>
            <ArrowRight size={16} />
          </button>
        ))}
        {q && !results.length && (
          <p className="search-empty">No matches in your library.</p>
        )}
        {!q && (
          <>
            <button
              onClick={() => {
                onClose();
                navigate("readings", { compose: "1" });
              }}
            >
              <BookOpen size={18} />
              Add a reading
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => {
                onClose();
                navigate("bank", { compose: "1" });
              }}
            >
              <Bookmark size={18} />
              Keep an expression
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => {
                onClose();
                navigate("practice");
              }}
            >
              <PenLine size={18} />
              Find a little practice
              <ArrowRight size={15} />
            </button>
          </>
        )}
      </div>
    </Dialog>
  );
}
