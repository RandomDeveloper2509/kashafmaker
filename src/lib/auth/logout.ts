"use client";

import { signOut } from "next-auth/react";

let loggingOut = false;

export async function logoutAndRedirect() {
  if (loggingOut) return;
  loggingOut = true;

  try {
    await Promise.allSettled([
      signOut({ redirect: false }),
      fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      }),
    ]);
  } finally {
    // Hard redirect clears any client-side Next.js router/session cache
    window.location.replace("/login");
  }
}
