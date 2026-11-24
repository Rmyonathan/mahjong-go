"use client"

import { useRef } from "react"
import { Camera, Upload } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Static tutorial + capture/upload (native camera / gallery).
 * No live getUserMedia — phone opens the system camera after Capture.
 */
export function ScanCameraViewfinder({
  onCapture,
  busy = false,
}: {
  onCapture: (file: File) => void
  busy?: boolean
}) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] max-h-[46dvh] overflow-hidden border-[2px] border-jade-ink bg-[linear-gradient(160deg,#1B2A1E_0%,#2F6B45_55%,#1B2A1E_100%)] sm:max-h-[22rem]">
        <div className="absolute inset-5 border border-dashed border-white/45" />
        <Corner className="left-3 top-3" />
        <Corner className="right-3 top-3 rotate-90" />
        <Corner className="bottom-3 left-3 -rotate-90" />
        <Corner className="bottom-3 right-3 rotate-180" />

        <div className="absolute inset-0 flex flex-col justify-between gap-2 overflow-y-auto px-4 py-4 text-white sm:px-5 sm:py-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-gold">
              How to photograph the hand
            </p>
            <p className="mt-1 font-serif text-xl leading-tight sm:text-2xl">
              Point at the winning tiles
            </p>
          </div>

          <ol className="space-y-1.5 text-sm leading-snug text-white/90">
            <li>
              <span className="font-mono text-[10px] text-jade-gold">1 · </span>
              Put the <strong className="font-semibold text-white">14 winning tiles</strong> in
              a clear row (or two neat rows), faces up.
            </li>
            <li>
              <span className="font-mono text-[10px] text-jade-gold">2 · </span>
              Put any <strong className="font-semibold text-white">flower / season</strong> tiles
              in a small row <strong className="font-semibold text-white">above</strong> those 14
              — colors may look different by set; still scan them.
            </li>
            <li>
              <span className="font-mono text-[10px] text-jade-gold">3 · </span>
              Close enough to count bamboo sticks;{" "}
              <strong className="font-semibold text-white">1 bamboo = bird</strong> (any bird art).
            </li>
            <li>
              <span className="font-mono text-[10px] text-jade-gold">4 · </span>
              Shoot from above, bright light, no glare — then Capture.
            </li>
          </ol>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label
          className={cn(
            "scan-cta-accent inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-none font-mono text-sm uppercase tracking-[0.14em] sm:h-16 sm:text-base",
            busy && "pointer-events-none opacity-50",
          )}
        >
          <Camera className="size-5 sm:size-6" />
          Capture & scan
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (file) onCapture(file)
            }}
          />
        </label>

        <label
          className={cn(
            "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 border-[2px] border-jade-ink bg-card font-mono text-[11px] uppercase tracking-[0.16em]",
            busy && "pointer-events-none opacity-50",
          )}
        >
          <Upload className="size-4" />
          Upload photo
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (file) onCapture(file)
            }}
          />
        </label>
      </div>
    </div>
  )
}

function Corner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute size-5 border-l-[3px] border-t-[3px] border-white/90",
        className,
      )}
    />
  )
}
