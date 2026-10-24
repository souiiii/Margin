import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { beginAuth } from "@/lib/auth";
import { guard } from "@/lib/security";
import { loopbackOrigin, loopbackUrl, usesLocalhost } from "@/lib/loopback";
import { oauthCookieName, oauthCookieOptions } from "@/lib/auth-cookie";
import { AppError, errorPayload } from "@/lib/errors";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  let origin: string;
  try {
    origin = loopbackOrigin(req);
    guard(req);
  } catch (error) {
    // An untrusted authority must never become a redirect destination.
    return NextResponse.json(errorPayload(error), {
      status: error instanceof AppError ? error.status : 500,
    });
  }
  if (usesLocalhost(req)) {
    const response = NextResponse.redirect(
      loopbackUrl(req, req.nextUrl.pathname, req.nextUrl.search),
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  try {
    const browser = randomBytes(32).toString("base64url");
    const url = await beginAuth(
      origin,
      browser,
      req.nextUrl.searchParams.get("account") || undefined,
      req.nextUrl.searchParams.get("enable") === "1",
    );
    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(oauthCookieName, browser, oauthCookieOptions);
    return response;
  } catch {
    const response = NextResponse.redirect(
      new URL("/?view=settings&auth_error=start", origin),
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
