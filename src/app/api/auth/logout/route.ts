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

function clearAuthCookies(req: NextRequest, res: NextResponse) {
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

  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";

  for (const name of toClear) {
    const isSecurePrefix =
      name.startsWith("__Secure-") || name.startsWith("__Host-");
    res.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: isSecurePrefix || isHttps,
    });
  }
}

export async function GET(req: NextRequest) {
  const res = new NextResponse(null, {
    status: 302,
    headers: {
      Location: "/login",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
  clearAuthCookies(req, res);
  return res;
}

export async function POST(req: NextRequest) {
  const res = NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
  clearAuthCookies(req, res);
  return res;
}
