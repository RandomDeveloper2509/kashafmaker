"use client";

import { logoutAction } from "@/app/actions/auth";

export async function logoutAndRedirect() {
  await logoutAction();
}
