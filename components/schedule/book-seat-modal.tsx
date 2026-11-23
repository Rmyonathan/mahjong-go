"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

import { DynamicQris } from "@/components/payment/dynamic-qris"
import { whatsAppBookingConfirmUrl } from "@/lib/pro-payment"
import { QRIS_AMOUNT } from "@/lib/qris"
import {
  boardLabel,
  formatFeeIdr,
  type ApiMeet,
  type ApiPaymentMethod,
} from "@/lib/schedule/types"
import { cn } from "@/lib/utils"

export function BookSeatModal({
  open,
  meet,
  onClose,
  onConfirm,
  accountName,
}: {
  open: boolean
  meet: ApiMeet | null
  onClose: () => void
  onConfirm: (
    method: ApiPaymentMethod,
  ) => Promise<{ seatNumber: number; checkInCode: string } | null>
  accountName?: string
}) {
  const [method, setMethod] = useState<ApiPaymentMethod>("QRIS")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticket, setTicket] = useState<{
    code: string
    seatNumber: number
    method: ApiPaymentMethod
  } | null>(null)

  useEffect(() => {
    if (!open) {
      setTicket(null)
      setMethod("QRIS")
      setError(null)
      setPending(false)
    }
  }, [open])

  if (!open || !meet) return null

  const nextSeat = meet.confirmedCount + 1
  const feeIdr = meet.feeIdr > 0 ? meet.feeIdr : QRIS_AMOUNT.BOOKING_DEFAULT
  const waUrl = whatsAppBookingConfirmUrl({
    accountName,
    meetTitle: meet.title,
    amountIdr: feeIdr,
  })

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      const result = await onConfirm(method)
      if (!result) {
        setError("Booking failed")
        return
      }
      setTicket({
        code: result.checkInCode,
        seatNumber: result.seatNumber,
        method,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close booking modal"
        className="absolute inset-0 bg-jade-ink/55"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto border-[2px] border-jade-ink bg-parchment shadow-[8px_8px_0_0_var(--jade-ink)] sm:mx-4">
        <div className="flex items-center justify-between border-b-[2px] border-jade-ink px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {ticket ? "Check-in ticket" : "Confirm seat"}
            </p>
            <h2 className="font-serif text-2xl">
              {ticket ? "You're in" : "Book seat"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center border-[2px] border-jade-ink bg-card"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {!ticket ? (
            <>
              <div className="jade-card p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {meet.whenLabel}
                </p>
                <h3 className="mt-1 font-serif text-2xl leading-none">{meet.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{meet.location}</p>
                <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                  <span className="border border-jade-ink bg-muted px-2 py-1">
                    {boardLabel(meet.boardType)}
                  </span>
                  <span className="border border-jade-ink bg-card px-2 py-1">
                    {formatFeeIdr(feeIdr)}
                  </span>
                  <span className="border border-jade-accent bg-jade-accent px-2 py-1 text-white">
                    Seat #{nextSeat} of {meet.maxSeats}
                  </span>
                </div>
              </div>

              <fieldset>
                <legend className="font-mono text-[10px] uppercase tracking-[0.16em]">
                  Payment method
                </legend>
                <div className="mt-2 flex flex-col gap-2">
                  {(
                    [
                      ["QRIS", "Pay via QRIS (amount locked)"],
                      ["VENUE", "Pay at venue"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMethod(id)}
                      className={cn(
                        "border-[2px] border-jade-ink px-3 py-3 text-left font-mono text-[11px] uppercase tracking-[0.14em]",
                        method === id
                          ? "bg-jade-ink text-white"
                          : "bg-card hover:bg-muted",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {method === "QRIS" ? (
                <>
                  <DynamicQris
                    amount={feeIdr}
                    size={200}
                    label={`Dynamic QRIS · seat fee`}
                  />
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 w-full items-center justify-center border-[2px] border-jade-ink bg-card font-mono text-[11px] uppercase tracking-[0.16em]"
                  >
                    Confirm pay on WhatsApp
                  </a>
                </>
              ) : null}

              {error ? (
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-jade-red">
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                disabled={pending}
                onClick={confirm}
                className="scan-cta-accent inline-flex h-12 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-50"
              >
                {pending ? "Booking…" : "Confirm seat"}
              </button>
            </>
          ) : (
            <div className="jade-card-gold space-y-4 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-gold">
                Jade check-in
              </p>
              <h3 className="font-serif text-3xl leading-none">{meet.title}</h3>
              <p className="font-mono text-sm uppercase tracking-[0.14em]">
                Seat #{ticket.seatNumber}
              </p>
              <p className="text-sm text-muted-foreground">{meet.whenLabel}</p>
              <div className="mx-auto grid size-36 place-items-center border-[2px] border-jade-ink bg-white p-3">
                <QrMark code={ticket.code} />
              </div>
              <p className="text-center font-mono text-xs tracking-[0.2em]">
                {ticket.code}
              </p>
              <p className="text-center text-xs text-muted-foreground">
                Paid via {ticket.method === "QRIS" ? "QRIS" : "venue desk"} · show
                this ticket at the lounge door.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="scan-cta inline-flex h-11 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em]"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QrMark({ code }: { code: string }) {
  const cells = Array.from({ length: 81 }, (_, index) => {
    const char = code.charCodeAt(index % code.length) ?? 0
    return (char + index * 7) % 5 !== 0
  })
  return (
    <div className="grid size-full grid-cols-9 gap-0.5" aria-hidden title={code}>
      {cells.map((filled, index) => (
        <span
          key={index}
          className={cn("size-full", filled ? "bg-jade-ink" : "bg-transparent")}
        />
      ))}
    </div>
  )
}
