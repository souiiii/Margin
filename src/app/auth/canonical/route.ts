import { NextRequest, NextResponse } from "next/server";
import { loopbackUrl } from "@/lib/loopback";
import { AppError, errorPayload } from "@/lib/errors";

/** A route response retains an absolute Location; Next relativizes proxy redirects. */
export function GET(request: NextRequest) {
  try {
    const pathname = request.headers.get("x-margin-canonical-path") || "/";
    const search = request.headers.get("x-margin-canonical-search") || "";
    const response = NextResponse.redirect(
      loopbackUrl(request, pathname, search),
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return NextResponse.json(errorPayload(error), {
      status: error instanceof AppError ? error.status : 500,
    });
  }
}
