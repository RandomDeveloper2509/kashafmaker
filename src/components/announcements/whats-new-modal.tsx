"use client";

import { useEffect, useState } from "react";
import { Sparkles, X, ExternalLink, ShieldCheck, CheckCircle2, ChevronRight, Bell } from "lucide-react";
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
    id: "v1.2611.24",
    version: "v1.2611.24",
    date: "Nov 24, 2026",
    title: "User Management & Kashaf 'Prepared By' Attribution",
    summary: "Full administrative control over staff profiles and personalized Kashaf document generation signatures.",
    highlights: [
      "Full User Control: Administrators can now edit user names, emails, roles, reset passwords, and delete accounts directly from Settings.",
      "Kashaf 'Prepared By' Signature: Page 2 of every generated Kashaf now features the operator's name under the table, opposite the Kashaf ID.",
      "Live 'What's New' Feed: Instant access to system announcements, feature rollouts, and changelogs right from the top navigation bar.",
    ],
    tag: "Latest Update",
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
    tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
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
      "Qwen & Gemini 3.5 Turbo Vision: Upgraded visa extraction pipeline with sub-second response times and multi-key quota rotation.",
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

  useEffect(() => {
    try {
      const lastSeen = localStorage.getItem("rihal_last_seen_announcement");
      if (lastSeen !== LATEST_VERSION_ID) {
        setHasUnread(true);
      }
    } catch {
      // Ignore localStorage unavailable
    }
  }, []);

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
          "relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
          hasUnread
            ? "text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-xs"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent"
        )}
      >
        <Sparkles className={cn("h-3.5 w-3.5", hasUnread ? "text-indigo-600 animate-pulse" : "text-slate-500")} />
        <span className="hidden sm:inline">What&apos;s New</span>

        {/* Unread notification indicator */}
        {hasUnread && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
          </span>
        )}
      </button>

      {/* Flyout Modal Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-black/40 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
          <div
            className="flex flex-col w-full max-w-lg max-h-[92vh] sm:h-[88vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-3 sm:slide-in-from-right-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">What&apos;s New</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Recent improvements &amp; features</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Updates Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 divide-y divide-slate-100">
              {ANNOUNCEMENTS.map((item, idx) => (
                <div key={item.id} className={cn("space-y-3", idx > 0 ? "pt-5" : "")}>
                  {/* Version & Date */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{item.version}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-medium text-slate-500">{item.date}</span>
                    </div>
                    {item.tag && (
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-semibold border",
                          item.tagColor || "bg-slate-100 text-slate-700 border-slate-200"
                        )}
                      >
                        {item.tag}
                      </span>
                    )}
                  </div>

                  {/* Title & Summary */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{item.summary}</p>
                  </div>

                  {/* Highlights Bullet List */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
                    {item.highlights.map((highlight, hIdx) => {
                      const [prefix, ...rest] = highlight.split(":");
                      const body = rest.join(":");
                      return (
                        <div key={hIdx} className="flex items-start gap-2.5 text-xs text-slate-700">
                          <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                          <div className="leading-relaxed">
                            {body ? (
                              <>
                                <strong className="font-semibold text-slate-900">{prefix}:</strong>
                                <span className="text-slate-600">{body}</span>
                              </>
                            ) : (
                              <span>{highlight}</span>
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
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px] text-slate-400">Rihal Next System Engine</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold cursor-pointer"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
