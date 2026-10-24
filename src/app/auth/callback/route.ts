import { NextRequest, NextResponse } from "next/server";
import { finishAuth } from "@/lib/auth";
import { guard } from "@/lib/security";
import { loopbackOrigin, loopbackUrl, usesLocalhost } from "@/lib/loopback";
import { oauthCookieName, oauthCookieOptions } from "@/lib/auth-cookie";
import { AppError, errorPayload } from "@/lib/errors";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  let origin: string;
  try {
    origin = loopbackOrigin(req);
    guard(req, true);
  } catch (error) {
    return NextResponse.json(errorPayload(error), {
      status: error instanceof AppError ? error.status : 500,
    });
  }
  // Move aliases to the cookie's host before reading/consuming the transaction.
  if (usesLocalhost(req)) {
    const response = NextResponse.redirect(
      loopbackUrl(req, req.nextUrl.pathname, req.nextUrl.search),
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  let error = "";
  try {
    await finishAuth(
      req.nextUrl.searchParams,
      req.cookies.get(oauthCookieName)?.value,
      origin,
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Sign-in could not be completed.";
  }
  const target = new URL("/", origin);
  target.searchParams.set("view", "settings");
  if (error) target.searchParams.set("auth_error", error.slice(0, 300));
  else target.searchParams.set("connected", "1");
  const response = NextResponse.redirect(target);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(oauthCookieName, "", {
    ...oauthCookieOptions,
    maxAge: 0,
  });
  return response;
}
