"use client"

import { useMemo } from "react"
import { Download, ExternalLink, FileWarning } from "lucide-react"

import { resolveRulesPdfLink } from "@/lib/tournaments/rules-pdf-url"

export function TournamentRulesPdfPanel({
  rulesPdfUrl,
  rulesPdfName,
}: {
  rulesPdfUrl: string
  rulesPdfName?: string | null
}) {
  const downloadName = rulesPdfName?.trim() || "tournament-rules.pdf"
  const link = useMemo(() => resolveRulesPdfLink(rulesPdfUrl), [rulesPdfUrl])

  return (
    <div className="space-y-3">
      {link.embeddable && link.href ? (
        <iframe
          src={link.href}
          className="h-[min(52dvh,480px)] w-full rounded-xl border border-[#102A20]/15 bg-white sm:h-[min(70dvh,720px)] md:h-[min(85dvh,920px)]"
          title="Tournament Rules PDF"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-jade-gold/35 bg-jade-gold/5 px-4 py-10 text-center">
          <FileWarning className="size-10 text-jade-gold" aria-hidden />
          <p className="max-w-md text-sm text-muted-foreground">
            {link.hint ??
              "This rules link cannot be shown inside the page."}
          </p>
          <a
            href={link.href || rulesPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="tap-press inline-flex h-11 items-center gap-2 rounded-full bg-jade-accent px-5 font-mono text-[10px] uppercase tracking-[0.14em] text-white"
          >
            <ExternalLink className="size-4" aria-hidden />
            Open rules in new tab
          </a>
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {link.embeddable ? (
          <a
            href={link.href}
            download={downloadName}
            className="tap-press inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#102A20]/15 bg-white px-4 font-mono text-[10px] uppercase tracking-[0.12em] sm:w-auto"
          >
            <Download className="size-4" aria-hidden />
            Download PDF
          </a>
        ) : null}
        <a
          href={link.href || rulesPdfUrl}
          target="_blank"
          rel="noreferrer"
          className="tap-press inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-jade-accent/40 bg-jade-soft px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-jade-accent sm:w-auto"
        >
          <ExternalLink className="size-4" aria-hidden />
          Open full screen
        </a>
      </div>
    </div>
  )
}