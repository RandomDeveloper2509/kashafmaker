"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Users,
  Truck,
  UserCircle,
  Building2,
  FileText,
  Files,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";

const navigation = [
  {
    group: "Main",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
      { name: "Rides", href: "/rides", icon: Car, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
    ],
  },
  {
    group: "Fleet",
    items: [
      { name: "Drivers", href: "/drivers", icon: Users, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
      { name: "Vehicles", href: "/vehicles", icon: Truck, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
      { name: "Passengers", href: "/passengers", icon: UserCircle, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
    ],
  },
  {
    group: "Documents",
    items: [
      { name: "Templates", href: "/templates", icon: FileText, roles: ["ADMIN", "MANAGER"] },
      { name: "Documents", href: "/documents", icon: Files, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
      { name: "Reports", href: "/reports", icon: BarChart3, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
    ],
  },
  {
    group: "Admin",
    items: [
      { name: "Companies", href: "/companies", icon: Building2, roles: ["ADMIN", "MANAGER"] },
      { name: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
    ],
  },
];

export function Sidebar({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = userName || session?.user?.name;
  const role = session?.user?.role || "OPERATOR";

  const groups = useMemo(
    () =>
      navigation
        .map((g) => ({
          ...g,
          items: g.items.filter((item) => item.roles.includes(role)),
        }))
        .filter((g) => g.items.length > 0),
    [role]
  );

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex h-16 shrink-0 items-center gap-3 px-4 border-b border-slate-100"
        onClick={() => setMobileOpen(false)}
      >
        <img
          src="/logo.png"
          alt="Rihal Next Logo"
          className="h-10 w-10 object-contain rounded-full shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 leading-tight truncate">Rihal Next</p>
          <p className="text-[9px] text-slate-400 font-medium leading-tight truncate">Smarter Journeys. Seamless Operations.</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map((group) => (
          <div key={group.group}>
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <item.icon
                      className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-400")}
                    />
                    <span className="flex-1 truncate">{item.name}</span>
                    {isActive && <ChevronRight className="h-3 w-3 text-indigo-200 shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-slate-100 p-3">
        {displayName && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 mb-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{role}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed left-4 top-4 z-40 rounded-xl bg-white p-2 shadow-md border border-slate-200 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? (
          <X className="h-5 w-5 text-slate-600" />
        ) : (
          <Menu className="h-5 w-5 text-slate-600" />
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-56 border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 shadow-lg lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
