"use client"

import { QRCodeSVG } from "qrcode.react"

import { formatQrisIdr, generateDynamicQris } from "@/lib/qris"

export function DynamicQris({
  amount,
  size = 220,
  label,
}: {
  amount: number
  size?: number
  label?: string
}) {
  const value = generateDynamicQris(amount)

  return (
    <div className="border-[2px] border-jade-ink bg-card p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label ?? "QRIS · auto amount"}
      </p>
      <div className="mx-auto mt-3 flex justify-center bg-white p-3">
        <QRCodeSVG
          value={value}
          size={size}
          level="M"
          marginSize={2}
          title={`QRIS ${formatQrisIdr(amount)}`}
        />
      </div>
      <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Amount · {formatQrisIdr(amount)} · scan any e-wallet
      </p>
    </div>
  )
}
