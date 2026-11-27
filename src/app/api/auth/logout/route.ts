import { signOut } from "@/lib/auth";

/**
 * GET /api/auth/logout
 * Calls Auth.js signOut server-side — it knows the exact cookie names, path,
 * secure flag and domain it originally set, so it clears them perfectly.
 * Then redirects to /login.
 */
export async function GET() {
  await signOut({ redirectTo: "/login" });
}
