"use client";

import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function LogoutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <DropdownMenuItem
      variant="destructive"
      onSelect={() => {
        // Hard GET navigation to logout route — Auth.js clears its own cookies
        // server-side then 302 redirects to /login. No JS promises, no CSRF,
        // no race conditions.
        window.location.href = "/api/auth/logout";
      }}
    >
      <LogOut className="h-4 w-4" />
      {label}
    </DropdownMenuItem>
  );
}
