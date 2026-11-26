"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface AnnouncementItem {
  id: string;
  version: string;
  date: string;
  title: string;
  summary: string;
  highlights: string[];
  tag?: string;
  tagColor?: string;
}

export const ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: "v1.2611.26",
    version: "v1.2611.26",
    date: "Nov 26, 2026",
    title: "Redesigned Workspace & Live Ride Tracking Feed",
    summary:
      "A cleaner, faster operations interface with real-time ride monitoring, instant quick-view sheets, and streamlined navigation.",
    highlights: [
      "Live Ride Feed & Auto-Sync: The homepage now tracks today's rides in real time with animated status indicators, 10-second auto-refresh, and instant Live/Pause controls.",
      "Quick-View Slide-Over Sheet: Click any ride row to inspect route, driver, vehicle, and Kashaf PDF downloads without leaving the dashboard.",
      "Collapsible Navigation & Quick Account Menu: Collapse or expand the sidebar anytime, and access Settings or Log Out directly from the top-right account menu.",
      "One-Click CSV Export: Filter today's rides by status and export clean spreadsheets directly from the live feed.",
    ],
    tag: "Latest Update",
    tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "v1.2611.24",
    version: "v1.2611.24",
    date: "Nov 24, 2026",
    title: "User Management & Kashaf 'Prepared By' Attribution",
    summary:
      "Full administrative control over staff profiles and personalized Kashaf document generation signatures.",
    highlights: [
      "Full User Control: Administrators can now edit user names, emails, roles, reset passwords, and delete accounts directly from Settings.",
      "Kashaf 'Prepared By' Signature: Page 2 of every generated Kashaf now features the operator's name aligned under the table, opposite the Kashaf ID.",
      "Live 'What's New' Feed: Instant access to system announcements, feature rollouts, and changelogs right from the top navigation bar.",
    ],
    tag: "User Management",
    tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    id: "v1.2611.21",
    version: "v1.2611.21",
    date: "Nov 21, 2026",
    title: "Progressive Web App (PWA) & Instant Installation",
    summary: "Run Rihal Next as a standalone application on your PC, laptop, or mobile phone.",
    highlights: [
      "1-Click App Installation: Install Rihal Next directly onto Windows PC, Mac, and Android with native desktop shortcuts and home screen icons.",
      "Standalone Window Mode: Operates full-screen in its own clean window without browser URL bars, search fields, or tabs.",
      "Direct Mobile WebAPK: Configured public manifest and service worker delivery to eliminate browser shortcut fallbacks on Android.",
    ],
    tag: "PWA App",
    tagColor: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    id: "v1.2611.20",
    version: "v1.2611.20",
    date: "Nov 20, 2026",
    title: "Excel 4-Digit Year Standardization & Sequential IDs",
    summary: "Refined reporting data structures, preventing spreadsheet errors and ensuring seamless auditing.",
    highlights: [
      "4-Digit Year (YYYY): Excel ride exports format dates strictly as DD-MM-YYYY (e.g. 20-11-2026), resolving 2-digit year ambiguity errors in Microsoft Excel.",
      "Clean Sequential IDs: Export ID columns now output accurate integer sequence numbers (1700+).",
      "Full Route Filenames: PDF exports automatically include complete pickup and destination routes in the filename.",
    ],
    tag: "Reporting",
    tagColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "v1.2611.18",
    version: "v1.2611.18",
    date: "Nov 18, 2026",
    title: "High-Speed AI Vision & Dual-Engine OCR",
    summary: "Enhanced visa document extraction performance with accelerated vision models and UI sorting.",
    highlights: [
      "Qwen & Gemini Vision: Upgraded visa extraction pipeline with sub-second response times and multi-key quota rotation.",
      "Interactive Passenger Sorting: Reorder passenger sequences within a ride using up/down arrow buttons with real-time index renumbering.",
      "Sanitized Visa Fields: Strips extraneous punctuation and trailing dashes from Umrah visa parsing.",
    ],
    tag: "AI & OCR",
    tagColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
];

const LATEST_VERSION_ID = ANNOUNCEMENTS[0].id;

export function WhatsNewButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const lastSeen = localStorage.getItem("rihal_last_seen_announcement");
      if (lastSeen !== LATEST_VERSION_ID) {
        setHasUnread(true);
      }
    } catch {
      // Ignore localStorage unavailable
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnread(false);
    try {
      localStorage.setItem("rihal_last_seen_announcement", LATEST_VERSION_ID);
    } catch {
      // Ignore
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        type="button"
        title="What's New in Rihal Next"
        className={cn(
          "relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer border",
          hasUnread
            ? "text-foreground bg-muted border-border shadow-xs hover:bg-accent"
            : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
        )}
      >
        <Sparkles className={cn("h-3.5 w-3.5", hasUnread ? "text-(--live) animate-pulse" : "text-muted-foreground")} />
        <span className="hidden sm:inline">What&apos;s New</span>

        {hasUnread && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-(--live) opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-(--live)" />
          </span>
        )}
      </button>

      {/* Centered Modal Popup */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            onClick={() => setIsOpen(false)}
            className="tallie-dashboard fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="whats-new-title"
              className="flex flex-col w-full max-w-xl max-h-[84vh] rounded-2xl bg-background text-foreground shadow-2xl border border-border overflow-hidden animate-slide-up"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground border border-border">
                    <Sparkles className="h-4 w-4 text-(--live)" />
                  </div>
                  <div>
                    <h2 id="whats-new-title" className="font-serif text-xl font-normal text-foreground leading-tight">
                      What&apos;s New in Rihal Next
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Product updates, design improvements &amp; release notes
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Updates Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 divide-y divide-border">
                {ANNOUNCEMENTS.map((item, idx) => (
                  <div key={item.id} className={cn("space-y-3", idx > 0 ? "pt-5" : "")}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {item.version}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {item.date}
                        </span>
                      </div>
                      {item.tag && (
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] font-semibold border",
                            item.tagColor || "bg-muted text-foreground border-border"
                          )}
                        >
                          {item.tag}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-foreground leading-snug">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {item.summary}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-zinc-50/70 dark:bg-card p-3.5 space-y-2">
                      {item.highlights.map((highlight, hIdx) => {
                        const [prefix, ...rest] = highlight.split(":");
                        const body = rest.join(":");
                        return (
                          <div key={hIdx} className="flex items-start gap-2.5 text-xs text-foreground">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-foreground shrink-0 mt-1.5" />
                            <div className="leading-relaxed">
                              {body ? (
                                <>
                                  <strong className="font-semibold text-foreground">{prefix}:</strong>
                                  <span className="text-muted-foreground">{body}</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">{highlight}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-border bg-zinc-50/60 dark:bg-card px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Rihal Next Operations Platform</span>
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 text-xs font-medium cursor-pointer"
                  onClick={() => setIsOpen(false)}
                >
                  Got it
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
