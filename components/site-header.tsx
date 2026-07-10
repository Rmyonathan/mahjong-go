import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-lg text-primary-foreground shadow-sm">
            🀄
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-base font-semibold tracking-tight">
              Mahjong-Go
            </span>
            <span className="text-[11px] text-muted-foreground">
              Panduan &amp; Kalkulator Poin
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Beranda
          </Link>
          <Link
            href="/calculator"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Kalkulator
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
