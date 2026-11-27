"use client";

import { logoutAction } from "@/app/actions/auth";
import { LogOut } from "lucide-react";

export function LogoutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none transition-colors hover:bg-destructive/10 focus:bg-destructive/10"
      >
        <LogOut className="h-4 w-4" />
        {label}
      </button>
    </form>
  );
}
