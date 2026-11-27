import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/components/watermelon/tallie-dashboard/dashboard.css";
import { AuthSessionProvider } from "@/components/layout/session-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Rihal Next - Smarter Journeys. Seamless Operations.",
  description: "Smarter Journeys. Seamless Operations.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rihal Next",
  },
  icons: {
    icon: "/logo.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__pwaPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__pwaPrompt = e;
                window.dispatchEvent(new Event('pwa-prompt-ready'));
              });
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(function(reg) {
                    reg.update();
                  }).catch(function() {});
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full antialiased">
        <TooltipProvider>
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
