"use client"

import { useState } from "react"
import { Check, Sparkles } from "lucide-react"

import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import { PRO_PRICE_LABEL } from "@/lib/pro-payment"
import { cn } from "@/lib/utils"

export function PlayerMembershipCard({
  tierLabel,
  isPro,
  isAdmin,
  proExpiresAt,
  accountName,
}: {
  tierLabel: "Club leader" | "Pro" | "Free"
  isPro: boolean
  isAdmin: boolean
  proExpiresAt: string | null
  accountName?: string
}) {
  const [modalOpen, setModalOpen] = useState(false)

  const daysLeft =
    !isAdmin && isPro && proExpiresAt
      ? Math.ceil(
          (new Date(proExpiresAt).getTime() - Date.now()) /
            (24 * 60 * 60 * 1000),
        )
      : null

  const expiringSoon = daysLeft != null && daysLeft <= 7
  const expiryLabel = proExpiresAt
    ? new Date(proExpiresAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null

  return (
    <>
      <section
        aria-label="Membership status"
        className={cn(
          "relative mt-6 rounded-2xl border p-4 sm:p-5",
          isAdmin
            ? "border-jade-ink/25 bg-card"
            : isPro
              ? "border-jade-gold/45 bg-jade-gold/10"
              : "border-jade-accent/30 bg-jade-soft/55",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
                  isAdmin
                    ? "bg-jade-ink text-white"
                    : isPro
                      ? "bg-jade-gold text-jade-ink"
                      : "border border-[#102A20]/15 bg-white text-jade-ink",
                )}
              >
                {isPro ? <Sparkles className="size-3" aria-hidden /> : null}
                Membership · {tierLabel}
              </span>
              {expiringSoon && daysLeft != null ? (
                <span className="rounded-full bg-jade-red/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-jade-red">
                  {daysLeft <= 0
                    ? "Expires today"
                    : `${daysLeft}d left · Perpanjang`}
                </span>
              ) : null}
            </div>

            {isAdmin ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Club leader account — all Pro &amp; admin features unlocked.
              </p>
            ) : isPro ? (
              <p className="mt-2 text-sm text-jade-ink">
                You&apos;re on <strong>Jade Pro</strong>
                {expiryLabel ? ` · active until ${expiryLabel}` : ""}. All Pro
                perks are unlocked.
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm font-medium text-jade-ink">
                  You&apos;re currently on <strong>Free Membership</strong> —
                  upgrade to Jade Pro ({PRO_PRICE_LABEL}) to unlock everything.
                </p>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <li className="inline-flex items-center gap-1">
                    <Check className="size-3.5 text-jade-accent" aria-hidden />
                    Unlimited camera scans
                  </li>
                  <li className="inline-flex items-center gap-1">
                    <Check className="size-3.5 text-jade-accent" aria-hidden />
                    24h live tables
                  </li>
                  <li className="inline-flex items-center gap-1">
                    <Check className="size-3.5 text-jade-accent" aria-hidden />
                    Full archive &amp; Fan DNA
                  </li>
                  <li className="inline-flex items-center gap-1">
                    <Check className="size-3.5 text-jade-accent" aria-hidden />
                    2h early-bird seats
                  </li>
                </ul>
              </>
            )}
          </div>

          {!isAdmin ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              {!isPro ? (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="tap-press inline-flex h-10 items-center gap-1.5 rounded-full bg-jade-accent px-4 text-xs font-semibold text-white shadow-[0_6px_18px_-6px_rgba(22,121,76,0.55)]"
                >
                  <Sparkles className="size-3.5" aria-hidden />
                  Upgrade to Pro · {PRO_PRICE_LABEL}
                </button>
              ) : expiringSoon ? (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="tap-press inline-flex h-10 items-center gap-1.5 rounded-full bg-jade-ink px-4 text-xs font-semibold text-white"
                >
                  Perpanjang Pro
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="tap-press inline-flex h-10 items-center rounded-full border border-[#102A20]/15 bg-white px-4 text-xs font-semibold text-jade-ink"
                >
                  Pro Benefits &amp; Pricing
                </button>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <ProPerkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        accountName={accountName}
        mode={isPro ? "renew" : "upgrade"}
        expiresAt={proExpiresAt}
      />
    </>
  )
}
