import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isHomePage = req.nextUrl.pathname === "/home" || req.nextUrl.pathname.startsWith("/home/");
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");
  const pathname = req.nextUrl.pathname;
  const role = req.auth?.user?.role;

  // Allow all auth API routes
  if (isApiAuth) return NextResponse.next();

  // Allow public marketing/sales home page
  if (isHomePage) return NextResponse.next();

  // Allow API routes to be handled by their own auth logic
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // Allow static files, PWA assets and public media
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

  // Redirect to login if not logged in (except login page)
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect to dashboard if logged in and on login page
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
