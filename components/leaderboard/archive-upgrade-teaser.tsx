"use client"

import { useState } from "react"

import { ProPerkModal } from "@/components/schedule/pro-perk-modal"
import { FREE_SESSION_ARCHIVE_LIMIT } from "@/lib/membership"

export function ArchiveUpgradeTeaser({
  accountName,
}: {
  accountName?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="jade-card mt-3 border-dashed p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Older tables locked
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Free keeps the last {FREE_SESSION_ARCHIVE_LIMIT} sessions. Pro unlocks
          the permanent archive.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="scan-cta-accent mt-3 inline-flex h-10 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em]"
        >
          Upgrade via QRIS · Rp 29k/mo
        </button>
      </div>
      <ProPerkModal
        open={open}
        onClose={() => setOpen(false)}
        accountName={accountName}
      />
    </>
  )
}
