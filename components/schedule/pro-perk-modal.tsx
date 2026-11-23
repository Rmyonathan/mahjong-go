"use client"

import { X } from "lucide-react"

import { DynamicQris } from "@/components/payment/dynamic-qris"
import {
  PRO_AMOUNT_IDR,
  PRO_PRICE_LABEL,
  whatsAppProConfirmUrl,
} from "@/lib/pro-payment"

export function ProPerkModal({
  open,
  onClose,
  accountName,
}: {
  open: boolean
  onClose: () => void
  /** Optional account name prefilled into the WhatsApp confirm message. */
  accountName?: string
  /** @deprecated kept for callers that still pass a demo flip — ignored. */
  onSwitchPro?: () => void
}) {
  if (!open) return null

  const waUrl = whatsAppProConfirmUrl(accountName)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close Pro upgrade"
        className="absolute inset-0 bg-jade-ink/55"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto border-[2px] border-jade-ink bg-parchment shadow-[8px_8px_0_0_var(--jade-ink)] sm:mx-4">
        <div className="flex items-center justify-between border-b-[2px] border-jade-ink px-4 py-3">
          <h2 className="font-serif text-2xl">Upgrade via QRIS</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center border-[2px] border-jade-ink bg-card"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm leading-relaxed">
            Pro is {PRO_PRICE_LABEL} — scan the QR (amount locked), then ping
            WhatsApp so a host can flip Set PRO · 30d. Midtrans / Xendit later.
          </p>
          <ul className="jade-card space-y-2 p-3 font-mono text-[11px] uppercase tracking-[0.14em]">
            <li>★ 2-hour early-bird seats</li>
            <li>★ Full session archive</li>
            <li>★ Nemesis · victim · Fan DNA</li>
          </ul>

          <DynamicQris
            amount={PRO_AMOUNT_IDR}
            label={`Dynamic QRIS · ${PRO_PRICE_LABEL}`}
          />

          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="scan-cta-accent inline-flex h-11 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em]"
          >
            Confirm on WhatsApp
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-full items-center justify-center border-[2px] border-jade-ink bg-card font-mono text-[11px] uppercase tracking-[0.16em]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
