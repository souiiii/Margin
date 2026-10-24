import { NextRequest, NextResponse } from "next/server";
import { loopbackOrigin, loopbackUrl, usesLocalhost } from "@/lib/loopback";
import { AppError, errorPayload } from "@/lib/errors";

export function proxy(request: NextRequest) {
  try {
    loopbackOrigin(request);
    if (usesLocalhost(request)) {
      // Next relativizes proxy Location headers against its bound IP even when
      // the incoming Host is localhost. Let a route emit the absolute redirect.
      const headers = new Headers(request.headers);
      headers.set("x-margin-canonical-path", request.nextUrl.pathname);
      headers.set("x-margin-canonical-search", request.nextUrl.search);
      const response = NextResponse.rewrite(
        loopbackUrl(request, "/auth/canonical"),
        { request: { headers } },
      );
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    return NextResponse.next();
  } catch (error) {
    return NextResponse.json(errorPayload(error), {
      status: error instanceof AppError ? error.status : 500,
    });
  }
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
