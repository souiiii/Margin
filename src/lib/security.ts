import { AppError } from "./errors";
export function guard(request: Request, callback = false) {
  const host = request.headers.get("host") || "";
  const origin = `http://${host}`;
  const expected = process.env.MARGIN_ORIGIN;
  if (
    !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host) ||
    (expected && new URL(expected).host !== host)
  )
    throw new AppError(
      "Margin is available only on this computer.",
      403,
      "local_only",
    );
  if (!callback && request.headers.get("sec-fetch-site") === "cross-site")
    throw new AppError(
      "Open Margin directly on this computer.",
      403,
      "cross_site",
    );
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    request.headers.get("origin") !== origin
  )
    throw new AppError("Reload Margin and try again.", 403, "invalid_origin");
}
export async function bodyJson(request: Request, max = 1_000_000) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError("Expected JSON.", 415);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > max) throw new AppError("This file is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("Missing request body.");
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel();
      throw new AppError("This file is too large.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError("The JSON file could not be read.");
  }
}
