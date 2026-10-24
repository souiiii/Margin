import { AppError } from "./errors";

/** Never use NextRequest.url/nextUrl.origin here: Next normalizes loopback IPs. */
export function normalizeLoopbackOrigin(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    url.port === "0" ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Expected an HTTP loopback origin.");
  url.hostname = "127.0.0.1";
  return url.origin;
}

export function loopbackOrigin(request: Pick<Request, "headers">): string {
  const host = request.headers.get("host") || "";
  // Use the actual validated authority, never forwarded headers or an arbitrary URL.
  if (!/^(127\.0\.0\.1|localhost)(?::[0-9]{1,5})?$/i.test(host))
    throw new AppError(
      "Margin is available only on this computer.",
      403,
      "local_only",
    );
  let origin: string;
  try {
    origin = normalizeLoopbackOrigin(`http://${host}`);
  } catch {
    throw new AppError(
      "Margin is available only on this computer.",
      403,
      "local_only",
    );
  }
  const configured = process.env.MARGIN_ORIGIN;
  if (configured) {
    let expected: string;
    try {
      expected = normalizeLoopbackOrigin(configured);
    } catch {
      throw new AppError(
        "MARGIN_ORIGIN must be an HTTP loopback origin, including the local port.",
        500,
        "invalid_origin_configuration",
      );
    }
    if (origin !== expected)
      throw new AppError(
        "Margin is available only on its configured local port.",
        403,
        "local_only",
      );
  }
  return origin;
}

export function loopbackUrl(
  request: Request,
  pathname: string,
  search = "",
): URL {
  const url = new URL(loopbackOrigin(request));
  url.pathname = pathname;
  url.search = search;
  return url;
}

export function usesLocalhost(request: Pick<Request, "headers">): boolean {
  return /^localhost(?::|$)/i.test(request.headers.get("host") || "");
}
