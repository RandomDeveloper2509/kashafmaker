import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_PREFIXES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
];

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });

  // Clear all known Auth.js / NextAuth cookies, including any chunked variants
  const existingCookies = req.cookies.getAll().map((c) => c.name);
  const toClear = new Set<string>(SESSION_COOKIE_PREFIXES);

  for (const name of existingCookies) {
    if (
      SESSION_COOKIE_PREFIXES.some(
        (prefix) => name === prefix || name.startsWith(`${prefix}.`)
      )
    ) {
      toClear.add(name);
    }
  }

  for (const name of toClear) {
    const isSecure = name.startsWith("__Secure-") || name.startsWith("__Host-");
    res.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
    });
  }

  return res;
}
