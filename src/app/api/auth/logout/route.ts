import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

const AUTH_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
];

/**
 * GET /api/auth/logout
 * Explicitly clears all Auth.js cookies on a non-cacheable 302 NextResponse
 * (avoiding Next.js Route Handler `redirect()` cookie-drop issues) and redirects to /login.
 */
export async function GET(req: NextRequest) {
  let authCookies: Array<{
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }> = [];

  try {
    const res = await signOut({ redirect: false });
    if (res && Array.isArray(res.cookies)) {
      authCookies = res.cookies;
    }
  } catch {
    // Proceed with manual cookie clearing even if signOut throws
  }

  const response = NextResponse.redirect(new URL("/login", req.url), {
    status: 302,
  });

  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";

  if (isHttps) {
    response.headers.set("Clear-Site-Data", '"cookies"');
  }

  // Apply exact cookie deletions returned by Auth.js
  for (const c of authCookies) {
    response.cookies.set(c.name, c.value ?? "", {
      ...(c.options as Record<string, unknown>),
      maxAge: 0,
      expires: new Date(0),
      path: "/",
    });
  }

  // Also explicitly expire any matching auth cookies present on the request
  const toClear = new Set<string>(AUTH_COOKIE_NAMES);
  for (const c of req.cookies.getAll()) {
    if (
      c.name.includes("authjs") ||
      c.name.includes("next-auth")
    ) {
      toClear.add(c.name);
    }
  }

  for (const name of toClear) {
    const isSecurePrefix =
      name.startsWith("__Secure-") || name.startsWith("__Host-");
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: isSecurePrefix || isHttps,
    });
  }

  return response;
}
