"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, Monitor, X, Share2, PlusSquare, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Module-level variable to store early beforeinstallprompt event
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deviceType, setDeviceType] = useState<"desktop" | "android" | "ios">("desktop");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if running in standalone mode (already installed & opened as app)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Detect device type
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDeviceType("ios");
    } else if (/android/.test(ua)) {
      setDeviceType("android");
    } else {
      setDeviceType("desktop");
    }

    // Register service worker if supported
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.log("SW register notice:", err));
    }

    // Event listener for prompt if not captured yet
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (onShowFallbackGuide?: () => void) => {
    const promptToUse = deferredPrompt || globalDeferredPrompt;
    if (promptToUse) {
      try {
        await promptToUse.prompt();
        const choice = await promptToUse.userChoice;
        if (choice.outcome === "accepted") {
          setIsStandalone(true);
          setDeferredPrompt(null);
          globalDeferredPrompt = null;
        }
      } catch (err) {
        console.error("Install prompt error:", err);
        if (onShowFallbackGuide) onShowFallbackGuide();
      }
    } else {
      // Browser didn't expose native dialog directly; show friendly guide
      if (onShowFallbackGuide) {
        onShowFallbackGuide();
      }
    }
  };

  return {
    mounted,
    isStandalone,
    deviceType,
    hasPrompt: !!deferredPrompt || !!globalDeferredPrompt,
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
  const { mounted, isStandalone, deviceType, triggerInstall } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"desktop" | "android" | "ios">("desktop");

  useEffect(() => {
    if (deviceType) {
      setActiveTab(deviceType);
    }
  }, [deviceType]);

  // Don't render until client mounts, or if already in standalone app mode
  if (!mounted || isStandalone) {
    return null;
  }

  const handleClick = () => {
    triggerInstall(() => setShowModal(true));
  };

  return (
    <>
      {variant === "sidebar" && (
        <button
          onClick={handleClick}
          type="button"
          className={cn(
            "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 shadow-xs cursor-pointer",
            className
          )}
          title="Install Rihal Next on PC or Phone"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white shadow-xs group-hover:scale-105 transition-transform">
            <Download className="h-3.5 w-3.5" />
          </div>
          <span className="flex-1 text-left truncate">Install App</span>
          <span className="rounded bg-indigo-200/80 px-1.5 py-0.5 text-[10px] font-bold text-indigo-900">
            App
          </span>
        </button>
      )}

      {variant === "header" && (
        <button
          onClick={handleClick}
          type="button"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-xs cursor-pointer",
            className
          )}
          title="Install Rihal Next on PC or Mobile"
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
          className={cn("gap-1.5 border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer", className)}
        >
          <Download className="h-3.5 w-3.5" />
          <span>Install App</span>
        </Button>
      )}

      {/* Install Guide Modal (for when native browser prompt requires manual trigger or iOS) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Rihal Next" className="h-9 w-9 rounded-full shadow-xs" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">Install Rihal Next</h3>
                  <p className="text-[11px] text-slate-500">Access like a native app on PC or Mobile</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="mt-4 flex rounded-lg bg-slate-100 p-1 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab("desktop")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer",
                  activeTab === "desktop" ? "bg-white text-indigo-700 shadow-xs font-bold" : "hover:text-slate-900"
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>PC / Laptop</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("android")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer",
                  activeTab === "android" ? "bg-white text-indigo-700 shadow-xs font-bold" : "hover:text-slate-900"
                )}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ios")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer",
                  activeTab === "ios" ? "bg-white text-indigo-700 shadow-xs font-bold" : "hover:text-slate-900"
                )}
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>iPhone / iPad</span>
              </button>
            </div>

            {/* Tab 1: PC / Laptop */}
            {activeTab === "desktop" && (
              <div className="mt-4 space-y-3 text-xs text-slate-700">
                <p className="text-slate-600 text-xs font-medium">
                  In Chrome or Edge on Windows / Mac:
                </p>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px]">
                      1
                    </span>
                    <span>
                      Look at the <strong>right side of your URL address bar</strong> at the top.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px]">
                      2
                    </span>
                    <span>
                      Click the <strong>Install icon</strong> (🖥️ or ⊕) or click browser menu (<strong>⋮</strong>) → <strong>Install Rihal Next</strong>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px]">
                      3
                    </span>
                    <span>
                      Click <strong>Install</strong>. It creates a desktop icon and opens in its own clean window!
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Android */}
            {activeTab === "android" && (
              <div className="mt-4 space-y-3 text-xs text-slate-700">
                <p className="text-slate-600 text-xs font-medium">
                  In Chrome on your Android phone:
                </p>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px]">
                      1
                    </span>
                    <span>
                      Tap the <strong>three dots (⋮)</strong> menu in the top-right corner of Chrome.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px]">
                      2
                    </span>
                    <span>
                      Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px]">
                      3
                    </span>
                    <span>
                      Confirm <strong>Install</strong>. The Rihal Next app icon will appear on your phone home screen!
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: iOS */}
            {activeTab === "ios" && (
              <div className="mt-4 space-y-3 text-xs text-slate-700">
                <p className="text-slate-600 text-xs font-medium">
                  In Safari on iPhone or iPad:
                </p>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px]">
                      1
                    </span>
                    <span>
                      Tap the <strong className="inline-flex items-center gap-1 text-slate-900"><Share2 className="h-3.5 w-3.5 text-blue-500 inline" /> Share</strong> button in Safari's bottom bar.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px]">
                      2
                    </span>
                    <span>
                      Scroll down and tap <strong className="inline-flex items-center gap-1 text-slate-900"><PlusSquare className="h-3.5 w-3.5 inline" /> Add to Home Screen</strong>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px]">
                      3
                    </span>
                    <span>
                      Tap <strong>Add</strong> at top right. The app icon will be added to your home screen!
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Close Button */}
            <Button
              className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 cursor-pointer"
              onClick={() => setShowModal(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
