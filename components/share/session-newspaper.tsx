"use client"

import Image from "next/image"
import { useRef, useState } from "react"
import { Newspaper } from "lucide-react"

import { formatSignedPoints } from "@/lib/mock/jade-board"
import { computeSessionAwards } from "@/lib/share/awards"
import { shareOrDownloadImage } from "@/lib/share/capture"
import type { LiveSession } from "@/lib/session/live-demo"
import { cn } from "@/lib/utils"

export function SessionNewspaperButton({
  session,
  className,
}: {
  session: LiveSession
  className?: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const awards = computeSessionAwards(session)
  const ranked = [...session.seats].sort((a, b) => b.net - a.net)

  async function onShare() {
    if (!cardRef.current || busy) return
    setBusy(true)
    try {
      await shareOrDownloadImage({
        node: cardRef.current,
        fileName: `jade-session-${session.id.slice(0, 8)}.png`,
        title: `${session.title} · Session Newspaper`,
        text: `Jade Mahjong · ${session.title}`,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={onShare}
        className={cn(
          "scan-cta-accent inline-flex h-11 items-center gap-2 rounded-none px-4 font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-50",
          className,
        )}
      >
        <Newspaper className="size-4" />
        {busy ? "Printing…" : "Session newspaper"}
      </button>

      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-[-10000px] z-[-1]"
      >
        <div
          ref={cardRef}
          className="relative flex h-[1920px] w-[1080px] flex-col overflow-hidden bg-[#F4F0E6] text-[#1A1A1A]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          <div className="relative flex h-full flex-col px-14 pb-16 pt-20">
            <div className="flex items-start justify-between gap-6 border-b-[4px] border-[#1A1A1A] pb-8">
              <div>
                <p className="font-mono text-2xl uppercase tracking-[0.28em] text-[#5C6B5E]">
                  The Jade Ledger
                </p>
                <h1 className="mt-4 text-[5.5rem] leading-[0.92]">
                  Session Newspaper
                </h1>
                <p className="mt-4 font-mono text-3xl uppercase tracking-[0.14em]">
                  {session.title}
                </p>
              </div>
              <Image
                src="/jade.png"
                alt=""
                width={110}
                height={110}
                className="size-[110px] object-contain"
                unoptimized
              />
            </div>

            <p className="mt-8 font-mono text-2xl uppercase tracking-[0.18em] text-[#5C6B5E]">
              {session.hands.length} hands · {session.seats.length} seats · House
              HKOS
            </p>

            <section className="mt-12">
              <h2 className="border-b-[3px] border-[#1A1A1A] pb-3 font-mono text-3xl uppercase tracking-[0.2em]">
                Night awards
              </h2>
              <ul className="mt-8 space-y-8">
                {awards.map((award) => (
                  <li
                    key={award.id}
                    className="border-[3px] border-[#1A1A1A] bg-white px-8 py-7"
                  >
                    <p className="font-mono text-2xl uppercase tracking-[0.18em] text-[#8A6A1F]">
                      {award.title}
                    </p>
                    <p className="mt-3 text-6xl leading-none">{award.playerName}</p>
                    <p className="mt-4 font-mono text-3xl uppercase tracking-[0.12em] text-[#5C6B5E]">
                      {award.subtitle} · {award.detail}
                    </p>
                  </li>
                ))}
                {awards.length === 0 ? (
                  <li className="font-mono text-3xl uppercase tracking-[0.14em] text-[#5C6B5E]">
                    No awards yet — more hands next time.
                  </li>
                ) : null}
              </ul>
            </section>

            <section className="mt-14">
              <h2 className="border-b-[3px] border-[#1A1A1A] pb-3 font-mono text-3xl uppercase tracking-[0.2em]">
                Final table
              </h2>
              <ol className="mt-8 space-y-5">
                {ranked.map((seat, index) => (
                  <li
                    key={seat.wind}
                    className="flex items-baseline justify-between gap-4 border-b border-[#1A1A1A]/35 pb-4"
                  >
                    <span className="font-mono text-3xl uppercase tracking-[0.14em] text-[#5C6B5E]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-5xl leading-none">
                      {seat.name}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-4xl",
                        seat.net > 0 && "text-[#2E7D5A]",
                        seat.net < 0 && "text-[#B42318]",
                      )}
                    >
                      {formatSignedPoints(seat.net)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <p className="mt-auto pt-10 text-center font-mono text-2xl uppercase tracking-[0.2em] text-[#5C6B5E]">
              Drop this in the Jade WhatsApp group · Bandar Lampung
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
