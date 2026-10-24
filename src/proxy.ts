import { NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  if (/^localhost(:\d+)?$/.test(host)) {
    const url = new URL(request.url);
    url.hostname = "127.0.0.1";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
