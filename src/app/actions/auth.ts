"use server";

import { signOut } from "@/lib/auth";

export async function logoutAction() {
  // Server-side signOut knows the exact cookie names, attributes, domain and
  // secure flags that were used when the session was created → guaranteed clean clear.
  await signOut({ redirectTo: "/home" });
}
