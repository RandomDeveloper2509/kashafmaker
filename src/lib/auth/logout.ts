"use client";

export function logoutAndRedirect() {
  // Direct server navigation clears all Auth.js cookies atomically with 302 -> /login
  window.location.assign("/api/auth/logout");
}
