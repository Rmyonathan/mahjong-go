import type { Metadata, Viewport } from "next"
import { Fraunces, IBM_Plex_Mono, Source_Sans_3 } from "next/font/google"
import "./globals.css"

import { ThemeInitScript } from "@/components/theme-init-script"
import { ThemeProvider } from "@/components/theme-provider"
import { SiteChrome } from "@/components/site-chrome"
import { SiteHeader } from "@/components/site-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { PwaRegister } from "@/components/pwa-register"

const serif = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
})

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
})

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: {
    default: "Jade Mahjong — Club Tables Lampung",
    template: "%s",
  },
  description:
    "Jade Mahjong club app: schedule, leaderboard, HK Old Style scoring, and house ranks.",
  applicationName: "Jade Mahjong",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Jade Mahjong",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
}

// EDIT HERE — PWA theme bar / safe-area (match globals.css jade tokens).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F4EE" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1A14" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${serif.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <head />
      <body className="relative flex min-h-full flex-col bg-background font-sans text-foreground">
        <div
          className="paper-grain pointer-events-none fixed inset-0 z-0 opacity-40"
          aria-hidden
        />
        <ThemeInitScript />
        <ThemeProvider>
          <div className="relative z-10 flex min-h-full flex-1 flex-col">
            <SiteChrome>
              <SiteHeader />
            </SiteChrome>
            <div className="flex flex-1 flex-col pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-12">
              {children}
            </div>
            <SiteChrome>
              <footer className="site-footer mt-auto hidden border-t border-[#102A20]/10 md:block">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <span className="font-serif text-sm text-jade-ink">
                    Jade Mahjong · Vol. 01
                  </span>
                  <span>Club scoring · Bandar Lampung</span>
                </div>
              </footer>
            </SiteChrome>
            <MobileBottomNav />
            <PwaRegister />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
