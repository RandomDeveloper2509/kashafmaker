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
 * Clears all Auth.js cookies via Set-Cookie + Clear-Site-Data.
 * If an older Service Worker controlled this request (which causes browsers to
 * ignore Clear-Site-Data), the page unregisters the SW and reloads once with
 * ?cleaned=1 so Clear-Site-Data runs unintercepted before going to /login.
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

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Signing out…</title>
    <noscript><meta http-equiv="refresh" content="0;url=/login" /></noscript>
  </head>
  <body style="background:#080810;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
    <p>Signing out…</p>
    <script>
      (async function () {
        var hadController = false;
        try {
          if ("caches" in window) {
            var keys = await caches.keys();
            await Promise.all(keys.map(function (k) { return caches.delete(k); }));
          }
          if ("serviceWorker" in navigator) {
            hadController = !!navigator.serviceWorker.controller;
            var regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(function (r) { return r.unregister().catch(function () {}); }));
          }
        } catch (e) {}
        if (hadController && location.search.indexOf("cleaned=1") === -1) {
          window.location.replace("/api/auth/logout?cleaned=1");
          return;
        }
        window.location.replace("/login");
      })();
    </script>
  </body>
</html>`;

  const response = new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });

  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";

  if (isHttps) {
    response.headers.set("Clear-Site-Data", '"cookies"');
  }

  for (const c of authCookies) {
    response.cookies.set(c.name, c.value ?? "", {
      ...(c.options as Record<string, unknown>),
      maxAge: 0,
      expires: new Date(0),
      path: "/",
    });
  }

  const toClear = new Set<string>(AUTH_COOKIE_NAMES);
  for (const c of req.cookies.getAll()) {
    if (c.name.includes("authjs") || c.name.includes("next-auth")) {
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
