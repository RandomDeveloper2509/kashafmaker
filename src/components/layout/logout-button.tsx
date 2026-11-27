"use client";

import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function LogoutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <DropdownMenuItem
      variant="destructive"
      onSelect={(e) => {
        e.preventDefault();
        window.location.replace("/api/auth/logout");
      }}
    >
      <LogOut className="h-4 w-4" />
      {label}
    </DropdownMenuItem>
  );
}
