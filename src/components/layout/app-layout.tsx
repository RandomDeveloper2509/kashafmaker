"use client";

import type { CSSProperties } from "react";
import { Sidebar } from "./sidebar";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, ChevronRight, Home, ChevronDown, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import { InstallAppButton } from "@/components/pwa/install-button";
import { WhatsNewButton } from "@/components/announcements/whats-new-modal";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/watermelon/tallie-dashboard/components/tallie/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  rides: "Rides",
  new: "New",
  drivers: "Drivers",
  vehicles: "Vehicles",
  passengers: "Passengers",
  companies: "Companies",
  templates: "Templates",
  documents: "Documents",
  reports: "Reports",
  settings: "Settings",
  edit: "Edit",
};

function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = BREADCRUMB_LABELS[seg] || (seg.length > 12 ? `#${seg.slice(0, 8)}…` : seg);
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";

  return (
    <ThemeProvider defaultTheme="light" storageKey="rihal-theme">
      <ToastProvider>
        <SidebarProvider
        defaultOpen
        className="tallie-dashboard min-h-svh"
        style={
          {
            "--sidebar-width": "16.5rem",
            "--sidebar-width-icon": "4.25rem",
          } as CSSProperties
        }
      >
        <Sidebar />

        <main className="flex flex-1 flex-col min-w-0 bg-background text-foreground">
          {/* Topbar */}
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="md:hidden h-8.5 w-8.5 rounded-lg border border-border" />
              <Breadcrumb />
            </div>

            <div className="flex items-center gap-2.5">
              <WhatsNewButton />
              <InstallAppButton variant="header" />
              <Link href="/rides/new">
                <Button size="sm" variant="default" className="h-8.5 rounded-lg px-3.5 shadow-xs">
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">New Ride</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger
                  type="button"
                  aria-label="Account menu"
                  className="flex items-center gap-2 border-l border-border pl-3 rounded-lg py-1 pr-1 hover:bg-muted/60 transition-colors cursor-pointer outline-none"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-xs font-semibold text-foreground">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-medium text-foreground leading-tight">{userName}</p>
                    <p className="text-[10px] font-medium text-muted-foreground capitalize">
                      {session?.user?.role?.toLowerCase() || "operator"}
                    </p>
                  </div>
                  <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="tallie-dashboard w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="leading-tight">
                      <p className="text-sm font-medium text-foreground">{userName}</p>
                      {session?.user?.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {session.user.email}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {session?.user?.role || "OPERATOR"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {session?.user?.role === "ADMIN" && (
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <Settings />
                        Settings &amp; Users
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      void signOut({ callbackUrl: "/home" });
                    }}
                  >
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </ToastProvider>
    </ThemeProvider>
  );
}
