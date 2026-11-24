"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

import { StaticBookingQris } from "@/components/payment/static-booking-qris"
import {
  WHATSAPP_BOOKING_DISPLAY,
  whatsAppBookingConfirmUrl,
} from "@/lib/pro-payment"
import {
  boardLabel,
  formatFeeIdr,
  type ApiMeet,
  type ApiPaymentMethod,
} from "@/lib/schedule/types"
import { cn } from "@/lib/utils"

type ConfirmResult =
  | { kind: "pending" }
  | { kind: "waitlist" }
  | {
      kind: "confirmed"
      seatNumber: number
      checkInCode: string
    }

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
  onConfirm: (method: ApiPaymentMethod) => Promise<ConfirmResult>
  accountName?: string
}) {
  const [method, setMethod] = useState<ApiPaymentMethod>("QRIS")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConfirmResult | null>(null)

  useEffect(() => {
    if (!open) {
      setResult(null)
      setMethod("VENUE")
      setError(null)
      setPending(false)
    }
  }, [open])

  useEffect(() => {
    if (!open || !meet) return
    if (meet.feeIdr > 0) setMethod("QRIS")
    else setMethod("VENUE")
  }, [open, meet])

  if (!open || !meet) return null

  const nextSeat = meet.confirmedCount + 1
  const feeIdr = meet.feeIdr > 0 ? meet.feeIdr : 0
  const qrisOffered = feeIdr > 0
  const waUrl = whatsAppBookingConfirmUrl({
    accountName,
    meetTitle: meet.title,
    amountIdr: feeIdr,
  })
  const hostLabel = meet.isClubTable
    ? "Jade club owner"
    : meet.hostName
      ? `${meet.hostName}'s table`
      : "table host"

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      const next = await onConfirm(method)
      setResult(next)
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
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#102A20]/15 bg-[#F6F4EE] shadow-[0_24px_60px_-20px_rgba(16,42,32,0.45)] sm:mx-4 sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#102A20]/10 px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {result?.kind === "pending"
                ? "Awaiting host"
                : result?.kind === "waitlist"
                  ? "Waitlist"
                  : result?.kind === "confirmed"
                    ? "Check-in ticket"
                    : "Confirm seat"}
            </p>
            <h2 className="font-serif text-2xl">
              {result ? "Request sent" : "Book seat"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-[#102A20]/12 bg-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-28 sm:p-5 sm:pb-28">
          {!result ? (
            <>
              <div className="rounded-2xl border border-[#102A20]/10 bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {meet.whenLabel}
                </p>
                <h3 className="mt-1 font-serif text-2xl leading-none">
                  {meet.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {meet.location}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
                  <span className="rounded-full bg-[#F6F4EE] px-2.5 py-1">
                    {boardLabel(meet.boardType)}
                  </span>
                  <span className="rounded-full border border-[#102A20]/12 px-2.5 py-1">
                    {formatFeeIdr(feeIdr)}
                  </span>
                  <span className="rounded-full bg-jade-accent px-2.5 py-1 text-white">
                    Seat #{nextSeat} of {meet.maxSeats}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1",
                      meet.isClubTable
                        ? "bg-jade-gold/20 text-jade-gold"
                        : "bg-jade-soft text-jade-accent",
                    )}
                  >
                    {meet.isClubTable ? "Club table" : "Player table"}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Your seat stays <strong>pending</strong> until {hostLabel}{" "}
                  accepts. Confirmed seats cannot be cancelled freely.
                </p>
              </div>

              <fieldset>
                <legend className="font-mono text-[10px] uppercase tracking-[0.16em]">
                  Payment method
                </legend>
                <div className="mt-2 flex flex-col gap-2">
                  {(
                    [
                      ...(qrisOffered
                        ? ([["QRIS", "Pay via QRIS Jade"]] as const)
                        : []),
                      ["VENUE", "Pay at venue"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMethod(id)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left font-mono text-[11px] uppercase tracking-[0.14em] transition",
                        method === id
                          ? "border-jade-accent bg-jade-accent text-white"
                          : "border-[#102A20]/12 bg-white hover:bg-jade-soft/50",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {method === "QRIS" && qrisOffered ? (
                <>
                  <StaticBookingQris amountIdr={feeIdr} size={200} />
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 w-full items-center justify-center rounded-full border border-[#102A20]/15 bg-white font-mono text-[11px] uppercase tracking-[0.16em]"
                  >
                    Konfirmasi via {WHATSAPP_BOOKING_DISPLAY}
                  </a>
                </>
              ) : null}

              {error ? (
                <p className="rounded-xl bg-jade-red/10 px-3 py-2 text-sm text-jade-red">
                  {error}
                </p>
              ) : null}
            </>
          ) : result.kind === "pending" ? (
            <div className="space-y-4 rounded-2xl border border-jade-gold/40 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-gold">
                Pending approval
              </p>
              <h3 className="font-serif text-3xl leading-none">{meet.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Seat request sent to {hostLabel}. You&apos;ll get a check-in
                code once they accept — not before.
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Pay via {method === "QRIS" ? "QRIS" : "venue"} · {meet.whenLabel}
              </p>
            </div>
          ) : result.kind === "waitlist" ? (
            <div className="space-y-4 rounded-2xl border border-[#102A20]/10 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Waitlist
              </p>
              <h3 className="font-serif text-3xl leading-none">{meet.title}</h3>
              <p className="text-sm text-muted-foreground">
                Table is full. You&apos;re on the waitlist — the host will move
                you up if a seat opens.
              </p>
            </div>
          ) : (
            <div className="space-y-4 rounded-2xl border border-jade-gold/40 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-gold">
                Jade check-in
              </p>
              <h3 className="font-serif text-3xl leading-none">{meet.title}</h3>
              <p className="font-mono text-sm uppercase tracking-[0.14em]">
                Seat #{result.seatNumber}
              </p>
              <p className="text-center font-mono text-xs tracking-[0.2em]">
                {result.checkInCode}
              </p>
            </div>
          )}
        </div>

        {/* Sticky action — always visible OK / Request */}
        <div className="absolute inset-x-0 bottom-0 border-t border-[#102A20]/10 bg-[#F6F4EE]/95 px-4 py-3 backdrop-blur-sm">
          {!result ? (
            <button
              type="button"
              disabled={pending}
              onClick={confirm}
              className="tap-press inline-flex h-12 w-full items-center justify-center rounded-full bg-jade-accent text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(22,121,76,0.7)] disabled:opacity-50"
            >
              {pending ? "Sending…" : "Request seat · OK"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="tap-press inline-flex h-12 w-full items-center justify-center rounded-full bg-jade-ink text-sm font-semibold text-white"
            >
              OK · Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
