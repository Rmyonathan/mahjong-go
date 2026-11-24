import Link from "next/link"

import { cn } from "@/lib/utils"

/** Full-width archive CTA — more visible than a text link. */
export function SeeAllLink({
  href,
  label,
  className,
}: {
  href: string
  label: string
  className?: string
}) {
  return (
    <div className={cn("border-t-[2px] border-jade-ink px-4 py-3", className)}>
      <Link
        href={href}
        className="tap-press inline-flex h-11 w-full items-center justify-center border-[2px] border-jade-ink bg-jade-accent font-mono text-[11px] uppercase tracking-[0.16em] text-white shadow-[3px_3px_0_0_var(--jade-ink)] transition hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_var(--jade-ink)]"
      >
        {label}
      </Link>
    </div>
  )
}
