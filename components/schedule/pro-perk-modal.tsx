"use client"

import { Check, Sparkles, X } from "lucide-react"

import { DynamicQris } from "@/components/payment/dynamic-qris"
import {
  FREE_SESSION_HISTORY_LIMIT,
  LIVE_SESSION_HOURS_FREE,
  LIVE_SESSION_HOURS_PRO,
} from "@/lib/membership"
import {
  PRO_AMOUNT_IDR,
  PRO_PRICE_LABEL,
  whatsAppProConfirmUrl,
} from "@/lib/pro-payment"

const PRO_BENEFITS = [
  {
    title: "Unlimited camera scans",
    detail: "Scan winning hands on your phone & hosted tables without the 3-scan Free cap.",
  },
  {
    title: `${LIVE_SESSION_HOURS_PRO}-hour live tables`,
    detail: `Hosted tables stay open up to ${LIVE_SESSION_HOURS_PRO}h instead of ${LIVE_SESSION_HOURS_FREE}h auto-end.`,
  },
  {
    title: "2-hour early-bird seats + waitlist priority",
    detail: "Lock seats on popular club tables before Free members and get priority waitlist bumps.",
  },
  {
    title: "Full session archive & search",
    detail: `Keep every finished table forever and search them from the top bar (Free keeps last ${FREE_SESSION_HISTORY_LIMIT}).`,
  },
  {
    title: "Nemesis · Victim · Fan DNA",
    detail: "Unlock head-to-head matchup stats, scouting insights, and winning-combo DNA on your profile.",
  },
  {
    title: "Clean IG Story Win Cards & Session Newspaper",
    detail: "Download watermark-free editorial win cards and post-session recap graphics.",
  },
  {
    title: "Daily WWYD AI math & Coach breakdown",
    detail: "Unlock optimal discard shanten breakdown and coach explanations on the daily puzzle.",
  },
  {
    title: "Coaching Video Vault & 20% off Hand Audits",
    detail: "Access all strategy clips plus 20% off 1-on-1 coaching and Guided Tables.",
  },
  {
    title: "Full AI Coach HUD & Hand Clinic",
    detail: "Practice with full target-hand suggestions and post-hand review between club nights.",
  },
  {
    title: "Gold Pro badge",
    detail: "Pro seal on the leaderboard, seat rosters, Live TV view, and your player card.",
  },
] as const

export function ProPerkModal({
  open,
  onClose,
  accountName,
  mode = "upgrade",
  expiresAt,
}: {
  open: boolean
  onClose: () => void
  /** Optional account name prefilled into the WhatsApp confirm message. */
  accountName?: string
  mode?: "upgrade" | "renew"
  expiresAt?: string | null
  /** @deprecated kept for callers that still pass a demo flip — ignored. */
  onSwitchPro?: () => void
}) {
  if (!open) return null

  const isRenew = mode === "renew"
  const waUrl = whatsAppProConfirmUrl(accountName, { renew: isRenew })
  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close Pro pricing"
        className="absolute inset-0 bg-jade-ink/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-pricing-title"
        className="relative z-10 flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[#102A20]/15 bg-parchment shadow-[0_24px_60px_-20px_rgba(16,42,32,0.45)] sm:rounded-2xl sm:border-[2px] sm:border-jade-ink sm:shadow-[8px_8px_0_0_var(--jade-ink)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#102A20]/10 px-4 py-3 sm:border-b-[2px] sm:border-jade-ink">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-jade-gold">
              {isRenew ? "Perpanjang Pro · 30 Hari" : `Jade Pro · ${PRO_PRICE_LABEL}`}
            </p>
            <h2 id="pro-pricing-title" className="font-serif text-2xl">
              {isRenew ? "Perpanjang Membership" : "Pro Membership & Pricing"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Pro pricing"
            className="grid size-9 place-items-center rounded-full border border-[#102A20]/15 bg-card"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {isRenew && expiryLabel ? (
            <div className="rounded-2xl border border-jade-gold/50 bg-jade-gold/15 px-4 py-3 text-sm text-jade-ink">
              Masa aktif Pro Anda berakhir pada <strong>{expiryLabel}</strong>.
              Transfer {PRO_PRICE_LABEL} untuk perpanjang 30 hari berikutnya.
            </div>
          ) : (
            <div className="rounded-2xl border border-jade-accent/25 bg-jade-soft/60 px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-serif text-xl text-jade-ink">
                  <Sparkles className="size-4 text-jade-gold" aria-hidden />
                  Jade Pro
                </span>
                <span className="font-mono text-sm font-semibold text-jade-accent">
                  {PRO_PRICE_LABEL} · 30 days
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                One flat monthly pass — no auto-charge. Scan QRIS, then ping
                WhatsApp so a host activates your 30 days.
              </p>
            </div>
          )}

          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              All Pro benefits included
            </p>
            <ul className="jade-card divide-y divide-[#102A20]/10">
              {PRO_BENEFITS.map((perk) => (
                <li key={perk.title} className="flex items-start gap-2.5 px-3.5 py-2.5">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-jade-soft text-jade-accent">
                    <Check className="size-3" strokeWidth={2.5} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-jade-ink">
                      {perk.title}
                    </p>
                    <p className="text-xs leading-snug text-muted-foreground">
                      {perk.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <DynamicQris
            amount={PRO_AMOUNT_IDR}
            label={`Dynamic QRIS · ${PRO_PRICE_LABEL}`}
          />

          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="scan-cta-accent inline-flex h-11 w-full items-center justify-center rounded-full font-mono text-[11px] uppercase tracking-[0.16em]"
          >
            {isRenew ? "Konfirmasi Perpanjang di WhatsApp" : "Confirm on WhatsApp"}
          </a>
        </div>

        <div className="shrink-0 border-t border-[#102A20]/10 bg-[#F6F4EE]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-full items-center justify-center rounded-full border border-[#102A20]/15 bg-card font-mono text-[11px] uppercase tracking-[0.16em]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
