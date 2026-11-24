"use client"

import { QRCodeSVG } from "qrcode.react"

import {
  formatQrisIdr,
  generateBookingDynamicQris,
} from "@/lib/qris"

export function StaticBookingQris({
  amountIdr,
  size = 200,
}: {
  amountIdr: number
  size?: number
}) {
  const value = generateBookingDynamicQris(amountIdr)

  return (
    <div className="rounded-2xl border border-[#102A20]/10 bg-white p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        QRIS Jade mahjong · booking meja
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Scan dengan e-wallet — nominal{" "}
        <strong className="font-normal text-jade-ink">
          {formatQrisIdr(amountIdr)}
        </strong>{" "}
        sudah terisi otomatis.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Konfirmasi transfer lewat WhatsApp booking — bukan nomor aplikasi Pro.
      </p>
      <div className="mx-auto mt-4 w-fit overflow-hidden rounded-xl border border-[#102A20]/10 bg-white p-3 shadow-sm">
        <QRCodeSVG
          value={value}
          size={size}
          level="M"
          marginSize={2}
          title={`QRIS Jade mahjong ${formatQrisIdr(amountIdr)}`}
        />
      </div>
      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {formatQrisIdr(amountIdr)} · scan GoPay / bank / e-wallet
      </p>
    </div>
  )
}