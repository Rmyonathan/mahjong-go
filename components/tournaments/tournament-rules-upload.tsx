"use client"

import { useRef, useState } from "react"
import { FileUp, X } from "lucide-react"

import { cn } from "@/lib/utils"

export function TournamentRulesUpload({
  selectedFile,
  onSelectFile,
  disabled,
  className,
}: {
  selectedFile: File | null
  onSelectFile: (file: File | null) => void
  disabled?: boolean
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function pick() {
    inputRef.current?.click()
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          onSelectFile(file)
          event.target.value = ""
        }}
      />
      <div
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          if (disabled) return
          const file = event.dataTransfer.files?.[0]
          if (file?.type === "application/pdf") onSelectFile(file)
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
          dragOver
            ? "border-jade-accent bg-jade-soft/50"
            : "border-[#102A20]/15 bg-white",
          disabled && "opacity-50",
        )}
      >
        <FileUp className="size-8 text-jade-accent" aria-hidden />
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Zung Jung / club rules PDF
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={pick}
          className="tap-press h-11 rounded-full bg-jade-ink px-5 font-mono text-[10px] uppercase tracking-[0.14em] text-white disabled:opacity-50"
        >
          Upload PDF file
        </button>
        <p className="max-w-xs text-xs text-muted-foreground">
          Works in the in-app preview. Max 10&nbsp;MB. Google Drive links cannot
          embed — upload the file instead.
        </p>
      </div>
      {selectedFile ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-jade-accent/30 bg-jade-soft/40 px-3 py-2 text-sm">
          <span className="truncate font-medium">{selectedFile.name}</span>
          <button
            type="button"
            onClick={() => onSelectFile(null)}
            className="shrink-0 rounded-full p-1 hover:bg-white/80"
            aria-label="Remove PDF"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  )
}