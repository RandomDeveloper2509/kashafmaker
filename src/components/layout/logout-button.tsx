"use client";

import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";

export function LogoutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <DropdownMenuItem
      variant="destructive"
      onSelect={(e) => {
        e.preventDefault();
        // next-auth/react signOut → POST /api/auth/signout (csrf-protected)
        // then hard-navigate away so no stale React state remains
        void signOut({ redirect: false }).then(() => {
          window.location.replace("/home");
        });
      }}
    >
      <LogOut />
      {label}
    </DropdownMenuItem>
  );
}
