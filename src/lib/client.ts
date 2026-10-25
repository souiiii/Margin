export interface ErrorMetadata {
  status?: number;
  providerCode?: string | null;
  providerMessage?: string;
  providerStatus?: number;
  transportStatus?: number;
  responseId?: string;
  param?: string | null;
  diagnosticId?: string;
}
export class ClientError extends Error {
  metadata: ErrorMetadata;
  constructor(
    message: string,
    public code = "",
    public requestId?: string,
    metadata: ErrorMetadata = {},
  ) {
    super(message);
    this.metadata = metadata;
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ClientError(
      data.error || "The request could not be completed.",
      data.code,
      data.requestId,
      { ...data, status: data.status ?? response.status },
    );
  return data;
}
export async function ai<T>(
  input: unknown,
  signal: AbortSignal,
  progress: (message: string) => void,
): Promise<T> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!response.ok) {
    const e = await response.json();
    throw new ClientError(e.error, e.code, e.requestId, {
      ...e,
      status: e.status ?? response.status,
    });
  }
  if (!response.body) throw new ClientError("No response from Margin.");
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 1);
        if (!line) continue;
        const event = JSON.parse(line);
        if (event.type === "status") progress(event.message);
        if (event.type === "progress") progress("Composing your lesson…");
        if (event.type === "error")
          throw new ClientError(
            event.error,
            event.code,
            event.requestId,
            event,
          );
        if (event.type === "done") return event.result as T;
      }
      if (done) {
        if (buffer.trim()) {
          const event = JSON.parse(buffer);
          if (event.type === "error")
            throw new ClientError(
              event.error,
              event.code,
              event.requestId,
              event,
            );
          if (event.type === "done") return event.result as T;
        }
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  throw new ClientError("The connection ended early. Try again.");
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function words(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
export function relativeDate(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  return days === 0
    ? "Today"
    : days === 1
      ? "Yesterday"
      : new Date(value).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
}
