"use client";
import { X } from "lucide-react";
import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { ai, api, ClientError, localDate } from "@/lib/client";
import type { AppState } from "@/lib/types";
interface Context {
  data: AppState;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  run: <T>(input: unknown) => Promise<T | null>;
  busy: boolean;
  mutate: <T>(path: string, method: string, body?: unknown) => Promise<T>;
  navigate: (view: string, params?: Record<string, string>) => void;
}
const C = createContext<Context | null>(null);
export const useMargin = () => {
  const c = useContext(C);
  if (!c) throw new Error("Margin provider missing");
  return c;
};
export function MarginProvider({
  initial,
  children,
  navigate,
}: {
  initial: AppState;
  children: ReactNode;
  navigate: Context["navigate"];
}) {
  const [data, setData] = useState(initial),
    [toast, setToast] = useState(""),
    [error, setError] = useState<ClientError | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const abort = useRef<AbortController | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = useCallback(async () => {
    const result = await api<AppState>(`state?date=${localDate()}`);
    setData(result);
  }, []);
  const notify = useCallback((text: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast(text);
    toastTimeout.current = setTimeout(() => setToast(""), 3500);
  }, []);
  const run = async <T,>(input: unknown): Promise<T | null> => {
    if (abort.current) {
      notify("Let your current request finish first.");
      return null;
    }
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    setMessage("Preparing your lesson…");
    try {
      const result = await ai<T>(input, controller.signal, setMessage);
      await refresh();
      return result;
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        setError(
          e instanceof ClientError
            ? e
            : new ClientError(
                e instanceof Error ? e.message : "Please try again.",
              ),
        );
      return null;
    } finally {
      abort.current = null;
      setBusy(false);
    }
  };
  const mutate = async <T,>(
    path: string,
    method: string,
    body?: unknown,
  ): Promise<T> => {
    const result = await api<T>(path, {
      method,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    await refresh();
    return result;
  };
  return (
    <C.Provider value={{ data, refresh, notify, run, busy, mutate, navigate }}>
      {children}
      {busy && (
        <div className="working" role="status">
          <span className="working-dots">
            <i />
            <i />
            <i />
          </span>
          <span>{message}</span>
          <button onClick={() => abort.current?.abort()}>Cancel</button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {error && (
        <div className="global-error" role="alert">
          <div>
            <strong>
              {error.code.includes("limit")
                ? "A pause for ChatGPT"
                : "That didn’t quite work"}
            </strong>
            <p>{error.message}</p>
            {error.requestId && <small>Request: {error.requestId}</small>}
            <div className="inline-actions">
              {["sign_in_required", "plan_permission_required"].includes(
                error.code,
              ) && (
                <button
                  onClick={() => {
                    setError(null);
                    navigate("settings");
                  }}
                >
                  Open Settings
                </button>
              )}
              {error.code.includes("limit") && (
                <a
                  href="https://chatgpt.com/settings/usage"
                  target="_blank"
                  rel="noreferrer"
                >
                  ChatGPT usage ↗
                </a>
              )}
            </div>
          </div>
          <button aria-label="Dismiss error" onClick={() => setError(null)}>
            <X size={18} />
          </button>
        </div>
      )}
    </C.Provider>
  );
}
