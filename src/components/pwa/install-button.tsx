"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  Smartphone,
  Monitor,
  X,
  Share2,
  PlusSquare,
  MoreVertical,
  Laptop,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

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

    // Check if already running in standalone mode (already installed & opened as app)
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

  const modalContent = showModal && typeof document !== "undefined" ? (
    createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div
          className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Rihal Next" className="h-10 w-10 rounded-full shadow-xs object-contain" />
              <div>
                <h3 className="font-bold text-slate-900 text-lg leading-tight">Install Rihal Next</h3>
                <p className="text-xs text-slate-500">Run as a standalone app on your PC or phone</p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Platform Tabs */}
          <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab("desktop")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer",
                activeTab === "desktop" ? "bg-white text-indigo-700 shadow-sm font-bold" : "hover:text-slate-900"
              )}
            >
              <Monitor className="h-4 w-4 shrink-0" />
              <span>PC / Laptop</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("android")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer",
                activeTab === "android" ? "bg-white text-indigo-700 shadow-sm font-bold" : "hover:text-slate-900"
              )}
            >
              <Smartphone className="h-4 w-4 shrink-0" />
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ios")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer",
                activeTab === "ios" ? "bg-white text-indigo-700 shadow-sm font-bold" : "hover:text-slate-900"
              )}
            >
              <Share2 className="h-4 w-4 shrink-0" />
              <span>iPhone</span>
            </button>
          </div>

          {/* Tab 1: PC / Laptop */}
          {activeTab === "desktop" && (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-medium text-slate-600">
                In <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> on Windows/Mac:
              </p>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[11px]">
                    1
                  </span>
                  <div>
                    <span className="font-semibold text-slate-900">Through Browser Menu (Easiest):</span>
                    <p className="text-slate-600 mt-0.5">
                      Click the <strong>three dots (⋮)</strong> at the very top-right of your browser window &rarr; select <strong>&quot;Install Rihal Next...&quot;</strong> (or <em>&quot;Save and share&quot; &rarr; &quot;Install Rihal Next&quot;</em>).
                    </p>
                  </div>
                </div>

                <div className="border-t border-indigo-100/80 pt-2.5 flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[11px]">
                    2
                  </span>
                  <div>
                    <span className="font-semibold text-slate-900">Or through the URL Address Bar:</span>
                    <p className="text-slate-600 mt-0.5">
                      Look at the right side inside your URL address bar (near the star bookmark icon). Click the <strong>Install computer icon</strong> (🖥️ or ⊕).
                    </p>
                  </div>
                </div>

                <div className="border-t border-indigo-100/80 pt-2.5 flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[11px]">
                    ✓
                  </span>
                  <div>
                    <span className="font-semibold text-slate-900">Click Install:</span>
                    <p className="text-slate-600 mt-0.5">
                      A desktop shortcut will be created and the panel will open in its own clean window without browser tabs!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Android */}
          {activeTab === "android" && (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-medium text-slate-600">
                In <strong>Chrome</strong> on your Android phone or tablet:
              </p>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[11px]">
                    1
                  </span>
                  <div>
                    <p className="text-slate-600">
                      Tap the <strong>three dots (⋮)</strong> menu in the top-right corner of Chrome.
                    </p>
                  </div>
                </div>

                <div className="border-t border-indigo-100/80 pt-2.5 flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[11px]">
                    2
                  </span>
                  <div>
                    <p className="text-slate-600">
                      Tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                    </p>
                  </div>
                </div>

                <div className="border-t border-indigo-100/80 pt-2.5 flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[11px]">
                    ✓
                  </span>
                  <div>
                    <p className="text-slate-600">
                      Confirm <strong>Install</strong>. The Rihal Next app icon will be added directly to your home screen and app drawer!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: iOS */}
          {activeTab === "ios" && (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-medium text-slate-600">
                In <strong>Safari</strong> on iPhone or iPad:
              </p>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[11px]">
                    1
                  </span>
                  <div>
                    <p className="text-slate-600">
                      Tap the <strong className="inline-flex items-center gap-1 text-slate-900"><Share2 className="h-3.5 w-3.5 text-blue-500 inline" /> Share</strong> button in Safari&apos;s bottom toolbar.
                    </p>
                  </div>
                </div>

                <div className="border-t border-indigo-100/80 pt-2.5 flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[11px]">
                    2
                  </span>
                  <div>
                    <p className="text-slate-600">
                      Scroll down and tap <strong className="inline-flex items-center gap-1 text-slate-900"><PlusSquare className="h-3.5 w-3.5 inline" /> Add to Home Screen</strong>.
                    </p>
                  </div>
                </div>

                <div className="border-t border-indigo-100/80 pt-2.5 flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[11px]">
                    ✓
                  </span>
                  <div>
                    <p className="text-slate-600">
                      Tap <strong>Add</strong> at top right. The app will be installed on your home screen!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Close button */}
          <Button
            className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 rounded-xl cursor-pointer shadow-sm"
            onClick={() => setShowModal(false)}
          >
            Got it
          </Button>
        </div>
      </div>,
      document.body
    )
  ) : null;

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

      {modalContent}
    </>
  );
}
