export const oauthCookieName = "margin_oauth";
export const oauthCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: false, // The supported local callback uses HTTP.
  path: "/",
  maxAge: 600,
} as const;
