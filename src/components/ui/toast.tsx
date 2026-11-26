"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const config = {
    success: {
      icon: CheckCircle2,
      classes: "bg-popover border-emerald-200 dark:border-emerald-800/60 text-popover-foreground",
      iconClass: "text-emerald-500",
      bar: "bg-emerald-500",
    },
    error: {
      icon: AlertCircle,
      classes: "bg-popover border-red-200 dark:border-red-800/60 text-popover-foreground",
      iconClass: "text-red-500",
      bar: "bg-red-500",
    },
    info: {
      icon: Info,
      classes: "bg-popover border-blue-200 dark:border-blue-800/60 text-popover-foreground",
      iconClass: "text-blue-500",
      bar: "bg-blue-500",
    },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((t) => {
          const { icon: Icon, classes, iconClass, bar } = config[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl min-w-[300px] max-w-sm pointer-events-auto animate-in slide-in-from-right overflow-hidden relative",
                classes
              )}
            >
              <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", bar)} />
              <Icon className={cn("h-5 w-5 shrink-0 mt-0.5 ml-1", iconClass)} />
              <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { toast: () => {} };
  }
  return ctx;
}
