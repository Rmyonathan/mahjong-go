import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Mahjong-Go — Panduan & Kalkulator Poin Mahjong",
    template: "%s",
  },
  description:
    "Panduan Mahjong interaktif dan kalkulator poin dengan antarmuka drag-and-drop. Mendukung Hong Kong Old Style dan Hokkien.",
};

// Skrip anti-flash: menerapkan tema sebelum React terhidrasi.
const themeScript = `
(function() {
  try {
    var key = 'mahjong-go-theme';
    var stored = localStorage.getItem(key);
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    var root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    root.style.colorScheme = theme;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head />
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ThemeProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <footer className="site-footer border-t border-border/60">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
              Mahjong-Go · Fase 1 · Dibuat dengan Next.js, Tailwind &amp;
              shadcn/ui
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
