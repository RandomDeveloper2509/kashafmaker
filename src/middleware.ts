import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isLoginPage = pathname === "/login";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isHomePage = pathname === "/home" || pathname.startsWith("/home/");
  const role = req.auth?.user?.role;

  // Allow Auth.js API routes through
  if (isApiAuth) return NextResponse.next();

  // Allow public home/marketing page
  if (isHomePage) return NextResponse.next();

  // Allow API routes
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // Allow static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|json|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  // Not logged in → send to login
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Logged in and on login page → send to dashboard
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Role-based access control
  if (role === "OPERATOR") {
    if (pathname.startsWith("/settings") || pathname.startsWith("/templates")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (role === "MANAGER" && pathname.startsWith("/settings")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|icons|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff|woff2|ttf)$|api/auth).*)",
  ],
};
