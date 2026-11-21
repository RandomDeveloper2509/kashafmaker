"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X, Share2, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Register service worker if supported
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.log("SW registration failed:", err));
    }

    // Listen for beforeinstallprompt (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // If iOS and not standalone, show install guide option
    if (isIosDevice) {
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (onShowIOSGuide?: () => void) => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsStandalone(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } else if (isIOS && onShowIOSGuide) {
      onShowIOSGuide();
    }
  };

  return {
    isInstallable,
    isStandalone,
    isIOS,
    hasPrompt: !!deferredPrompt,
    triggerInstall,
  };
}

export function InstallAppButton({
  variant = "sidebar",
  className,
}: {
  variant?: "sidebar" | "header" | "minimal";
  className?: string;
}) {
  const { isInstallable, isStandalone, isIOS, hasPrompt, triggerInstall } = usePWAInstall();
  const [showIosModal, setShowIosModal] = useState(false);

  // If already installed or browser hasn't fired prompt (and not iOS), don't show
  if (isStandalone || (!hasPrompt && !isIOS)) {
    return null;
  }

  const handleClick = () => {
    triggerInstall(() => setShowIosModal(true));
  };

  return (
    <>
      {variant === "sidebar" && (
        <button
          onClick={handleClick}
          type="button"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/90 border border-indigo-200/60 shadow-sm",
            className
          )}
          title="Install Rihal Next on PC or Android"
        >
          <Download className="h-4 w-4 text-indigo-600 shrink-0" />
          <span className="flex-1 text-left truncate font-semibold">Install App</span>
          <span className="rounded bg-indigo-200/80 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800">
            Free
          </span>
        </button>
      )}

      {variant === "header" && (
        <button
          onClick={handleClick}
          type="button"
          className={cn(
            "hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-xs",
            className
          )}
          title="Install Rihal Next as desktop or mobile application"
        >
          <Smartphone className="h-3.5 w-3.5 text-indigo-600" />
          <span>Install App</span>
        </button>
      )}

      {variant === "minimal" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          className={cn("gap-1.5 border-indigo-200 text-indigo-600 hover:bg-indigo-50", className)}
        >
          <Download className="h-3.5 w-3.5" />
          <span>Install App</span>
        </Button>
      )}

      {/* iOS Instructions Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Rihal Next" className="h-8 w-8 rounded-full" />
                <h3 className="font-bold text-slate-900 text-base">Install Rihal Next</h3>
              </div>
              <button
                onClick={() => setShowIosModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              Install Rihal Next to your iPhone or iPad home screen for instant access:
            </p>

            <ol className="mt-4 space-y-3 text-xs text-slate-700">
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                  1
                </span>
                <span>
                  Tap the <strong className="inline-flex items-center gap-1 font-semibold text-slate-900"><Share2 className="h-3.5 w-3.5 text-blue-500 inline" /> Share</strong> button in Safari's bottom toolbar.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                  2
                </span>
                <span>
                  Scroll down and tap <strong className="inline-flex items-center gap-1 font-semibold text-slate-900"><PlusSquare className="h-3.5 w-3.5 inline" /> Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                  3
                </span>
                <span>
                  Tap <strong className="font-semibold text-slate-900">Add</strong> in the top-right corner.
                </span>
              </li>
            </ol>

            <Button
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-9"
              onClick={() => setShowIosModal(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
