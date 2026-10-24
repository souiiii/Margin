import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { beginAuth } from "@/lib/auth";
import { guard } from "@/lib/security";
export const runtime="nodejs";
export async function GET(req:NextRequest) {
  try {
    guard(req);const host=req.headers.get("host")!;
    if(host.startsWith("localhost"))return NextResponse.redirect(`http://${host.replace("localhost","127.0.0.1")}${req.nextUrl.pathname}${req.nextUrl.search}`);
    const browser=randomBytes(32).toString("base64url");const url=await beginAuth(`http://${host}`,browser,req.nextUrl.searchParams.get("account")||undefined,req.nextUrl.searchParams.get("enable")==="1");
    const response=NextResponse.redirect(url);response.headers.set("Cache-Control","no-store");response.cookies.set("margin_oauth",browser,{httpOnly:true,sameSite:"lax",secure:false,path:"/",maxAge:600});return response;
  }catch {return NextResponse.redirect(new URL("/?view=settings&auth_error=start",req.url));}
}
