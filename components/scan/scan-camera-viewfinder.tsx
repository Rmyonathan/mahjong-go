"use client"

import Image from "next/image"
import { useRef } from "react"
import { Camera, Upload } from "lucide-react"

import { cn } from "@/lib/utils"

const EXAMPLE_PHOTO = "/tiles_ex.jpeg"

/**
 * Example photo + overlay guides, then capture/upload (native camera / gallery).
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
      <PhotoGuideHeading />

      <div className="relative w-full overflow-hidden border-[2px] border-jade-ink bg-jade-ink/10">
        <Image
          src={EXAMPLE_PHOTO}
          alt="Contoh foto: 14 ubin menang di kolom kiri, bunga/musim di samping"
          width={900}
          height={1200}
          className="block h-auto max-h-[min(56dvh,32rem)] w-full"
          sizes="(max-width: 512px) 100vw, 512px"
          priority
        />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-b from-jade-ink/20 via-transparent to-jade-ink/30"
            aria-hidden
          />

          <HandGuideBox
            className="left-[15%] top-[5%] h-[90%] w-[30%]"
            title="Winning hand"
            subtitle="14 tiles · satu kolom / dua baris rapi"
            labelPlacement="outside-top"
            labelExtraClass="translate-y-3"
          />

          <HandGuideBox
            className="left-[47%] top-[39%] h-[27%] w-[14%]"
            title="Flower / season"
            subtitle="Kolom kecil di samping 14 ubin"
            tone="gold"
            labelPlacement="outside-right"
          />

          <p className="absolute bottom-2 left-2 right-2 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            Contoh susunan · tiru layout ini saat foto
          </p>
        </div>
      </div>

      <ol className="mt-3 space-y-1.5 text-sm leading-snug text-muted-foreground">
        <li>
          <span className="font-mono text-[10px] text-jade-accent">1 · </span>
          14 ubin menang terlihat jelas — dekat cukup untuk hitung batang bambu (
          <strong className="font-medium text-jade-ink">1 bamboo = burung</strong>).
        </li>
        <li>
          <span className="font-mono text-[10px] text-jade-accent">2 · </span>
          Bunga/musim dalam kolom kecil di samping 14 ubin; warna bisa beda per
          set — tetap ikut difoto.
        </li>
        <li>
          <span className="font-mono text-[10px] text-jade-accent">3 · </span>
          Dari atas, cahaya terang, tanpa silau — lalu Capture atau Upload.
        </li>
      </ol>

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

function PhotoGuideHeading() {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      How to photograph the hand
    </p>
  )
}

type LabelPlacement =
  | "inside-top"
  | "outside-top"
  | "outside-bottom"
  | "outside-right"

function HandGuideBox({
  className,
  title,
  subtitle,
  tone = "accent",
  labelPlacement = "inside-top",
  labelExtraClass,
}: {
  className: string
  title: string
  subtitle: string
  tone?: "accent" | "gold"
  labelPlacement?: LabelPlacement
  labelExtraClass?: string
}) {
  const border =
    tone === "gold" ? "border-jade-gold" : "border-jade-accent"
  const chip =
    tone === "gold"
      ? "bg-jade-gold text-jade-ink"
      : "bg-jade-accent text-white"

  const labelClass: Record<LabelPlacement, string> = {
    "inside-top": "left-1 top-1 max-w-[calc(100%-0.5rem)]",
    "outside-top": "bottom-full left-1 mb-1 max-w-[10.5rem]",
    "outside-bottom":
      "left-1/2 top-full mt-1 w-max max-w-[10.5rem] -translate-x-1/2",
    "outside-right":
      "left-full top-1/2 ml-1.5 w-[6.5rem] -translate-y-1/2 sm:ml-2 sm:w-[7rem]",
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute rounded-sm border-2 border-dashed shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]",
        border,
        tone === "gold" ? "bg-jade-gold/12" : "bg-jade-accent/10",
        className,
      )}
    >
      <div
        className={cn(
          "absolute px-1.5 py-1 font-mono text-[8px] font-semibold uppercase leading-tight tracking-[0.08em] shadow-sm sm:text-[9px]",
          chip,
          labelClass[labelPlacement],
          labelExtraClass,
        )}
      >
        {title}
        <span className="mt-0.5 block font-normal normal-case tracking-normal opacity-90">
          {subtitle}
        </span>
      </div>
    </div>
  )
}