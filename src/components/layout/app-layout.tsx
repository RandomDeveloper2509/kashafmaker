"use client";

import { Sidebar } from "./sidebar";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import { InstallAppButton } from "@/components/pwa/install-button";

// Map href segments to readable labels
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
    <nav className="flex items-center gap-1 text-sm">
      <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          {crumb.isLast ? (
            <span className="font-medium text-slate-700">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="text-slate-400 hover:text-slate-600 transition-colors">
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
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Sidebar />
        <main className="lg:pl-56">
          {/* Top Navbar */}
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
            <div className="flex h-14 items-center justify-between px-4 sm:px-6">
              {/* Breadcrumb */}
              <div className="pl-12 lg:pl-0">
                <Breadcrumb />
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-3">
                <InstallAppButton variant="header" />
                <Link href="/rides/new">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span className="hidden sm:inline">New Ride</span>
                    <span className="sm:hidden">New</span>
                  </Button>
                </Link>

                <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{userName}</p>
                    <p className="text-[10px] font-medium text-slate-400 capitalize">
                      {session?.user?.role?.toLowerCase() || "operator"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
