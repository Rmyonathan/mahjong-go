import type { Metadata } from "next";
import Script from "next/script";
import { Fraunces, IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";

const serif = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Jade Mahjong — Buku Meja Lampung",
    template: "%s",
  },
  description:
    "Buku skor kedai Jade Mahjong: papan meja, pangkat, aturan HK Old Style, dan Scan tangan.",
};

const themeScript = `
(function() {
  try {
    var key = 'mahjong-go-theme';
    var stored = localStorage.getItem(key);
    var theme = stored === 'dark' ? 'dark' : 'light';
    var root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
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
      className={`${serif.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <head />
      <body className="relative flex min-h-full flex-col bg-background font-sans text-foreground">
        <div className="paper-grain pointer-events-none fixed inset-0 z-0 opacity-50" aria-hidden />
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ThemeProvider>
          <div className="relative z-10 flex min-h-full flex-1 flex-col">
            <SiteHeader />
            <div className="flex flex-1 flex-col">{children}</div>
            <footer className="site-footer mt-auto border-t-[2px] border-jade-ink">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 font-mono text-[10px] uppercase tracking-[0.18em] text-jade-ink sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <span>Jade Mahjong · Vol. 01</span>
                <span>Kedai skor · Bandar Lampung</span>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
