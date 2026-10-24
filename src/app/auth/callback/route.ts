import { NextRequest, NextResponse } from "next/server";
import { finishAuth } from "@/lib/auth";
import { guard } from "@/lib/security";
export const runtime="nodejs";
export async function GET(req:NextRequest) {
  let error="";
  try {guard(req,true);await finishAuth(req.nextUrl.searchParams,req.cookies.get("margin_oauth")?.value);}catch(e){error=e instanceof Error?e.message:"Sign-in could not be completed.";}
  const target=new URL("/",req.url);target.searchParams.set("view","settings");if(error)target.searchParams.set("auth_error",error.slice(0,300));else target.searchParams.set("connected","1");
  const response=NextResponse.redirect(target);response.headers.set("Cache-Control","no-store");response.cookies.delete("margin_oauth");return response;
}
