"use client"

import { useEffect, useMemo, useState } from "react"

import { TournamentRulesPdfPanel } from "@/components/tournaments/tournament-rules-pdf-panel"
import { TournamentRulesUpload } from "@/components/tournaments/tournament-rules-upload"
import { resolveRulesPdfLink } from "@/lib/tournaments/rules-pdf-url"
import {
  tournamentFormatBlurb,
  type ApiTournamentFormat,
} from "@/lib/tournaments/types"
import { cn } from "@/lib/utils"

export function CreateTournamentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [format, setFormat] = useState<ApiTournamentFormat>("POINTS_RACE")
  const [entryFeeIdr, setEntryFeeIdr] = useState(50000)
  const [prizePoolText, setPrizePoolText] = useState("")
  const [maxPlayers, setMaxPlayers] = useState(16)
  const [revivalEnabled, setRevivalEnabled] = useState(true)
  const [revivalFeeIdr, setRevivalFeeIdr] = useState(25000)
  const [maxRevivalsPerPlayer, setMaxRevivalsPerPlayer] = useState(1)
  const [koAdvancePerTable, setKoAdvancePerTable] = useState(1)
  const [rulesPdfUrl, setRulesPdfUrl] = useState("")
  const [rulesPdfName, setRulesPdfName] = useState<string | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panitiaUserId, setPanitiaUserId] = useState("")
  const [wasitUserId, setWasitUserId] = useState("")
  const [memberOptions, setMemberOptions] = useState<
    { userId: string; name: string }[]
  >([])

  useEffect(() => {
    if (!open) return
    setError(null)
    setPending(false)
    void fetch("/api/members")
      .then(async (response) => {
        if (!response.ok) return []
        const data = (await response.json()) as {
          members?: { userId: string; name: string }[]
        }
        return data.members ?? []
      })
      .then(setMemberOptions)
      .catch(() => setMemberOptions([]))
  }, [open])

  useEffect(() => {
    if (open) {
      document.body.dataset.tournamentModal = "1"
    } else {
      delete document.body.dataset.tournamentModal
    }
    return () => {
      delete document.body.dataset.tournamentModal
    }
  }, [open])

  const previewUrl = useMemo(() => {
    if (pdfFile) return URL.createObjectURL(pdfFile)
    if (rulesPdfUrl.trim()) return rulesPdfUrl.trim()
    return null
  }, [pdfFile, rulesPdfUrl])

  const externalLinkInfo = useMemo(
    () => (rulesPdfUrl.trim() ? resolveRulesPdfLink(rulesPdfUrl) : null),
    [rulesPdfUrl],
  )

  useEffect(() => {
    if (!pdfFile || !previewUrl?.startsWith("blob:")) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [pdfFile, previewUrl])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setError("Title required")
      return
    }
    setPending(true)
    setError(null)
    try {
      const form = new FormData()
      form.set("title", title.trim())
      form.set("subtitle", subtitle.trim())
      form.set("format", format)
      form.set("entryFeeIdr", String(entryFeeIdr))
      form.set("prizePoolText", prizePoolText.trim())
      form.set("maxPlayers", String(maxPlayers))
      form.set("revivalEnabled", revivalEnabled ? "true" : "false")
      form.set("revivalFeeIdr", String(revivalFeeIdr))
      form.set("maxRevivalsPerPlayer", String(maxRevivalsPerPlayer))
      form.set("koAdvancePerTable", String(koAdvancePerTable))
      if (panitiaUserId) form.set("panitiaUserId", panitiaUserId)
      if (wasitUserId) form.set("wasitUserId", wasitUserId)
      if (pdfFile) {
        form.set("rulesPdfFile", pdfFile)
      } else if (rulesPdfUrl.trim()) {
        form.set("rulesPdfUrl", rulesPdfUrl.trim())
        if (rulesPdfName) form.set("rulesPdfName", rulesPdfName)
      }
      const response = await fetch("/api/tournaments", {
        method: "POST",
        body: form,
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Could not create tournament")
        return
      }
      onCreated()
      onClose()
    } catch {
      setError("Network error")
    } finally {
      setPending(false)
    }
  }

  const inputClass =
    "mt-1 h-11 w-full rounded-xl border border-[#102A20]/15 bg-white px-3 text-sm outline-none ring-jade-accent/30 focus:border-jade-accent focus:ring-2"

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close create tournament"
        className="absolute inset-0 bg-jade-ink/55"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(94dvh,100%)] w-full max-w-lg flex-col overflow-hidden border-[2px] border-jade-ink bg-parchment shadow-[8px_8px_0_0_var(--jade-ink)] sm:mx-4 sm:max-h-[92vh] sm:rounded-2xl">
        <div className="border-b-[2px] border-jade-ink px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Admin only
          </p>
          <h2 className="font-serif text-2xl">Create tournament</h2>
        </div>
        <form
          onSubmit={(event) => void submit(event)}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="Jade Open — Zung Jung"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Subtitle
            </span>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className={inputClass}
              placeholder="Bandar Lampung · weekend"
            />
          </label>

          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Format
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["POINTS_RACE", "Points race"],
                  ["KNOCKOUT", "Knockout"],
                  ["HYBRID_KO", "Hybrid KO"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFormat(id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em]",
                    format === id
                      ? "border-jade-ink bg-jade-ink text-white"
                      : "border-[#102A20]/15 bg-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {tournamentFormatBlurb(format)}
            </p>
          </fieldset>

          {format === "KNOCKOUT" || format === "HYBRID_KO" ? (
            <label className="block rounded-xl border border-[#102A20]/10 bg-white p-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                Advance per table (KO)
              </span>
              <select
                value={koAdvancePerTable}
                onChange={(e) =>
                  setKoAdvancePerTable(Number(e.target.value) || 1)
                }
                className={cn(inputClass, "mt-2")}
              >
                <option value={1}>Top 1 per table</option>
                <option value={2}>Top 2 per table</option>
              </select>
              <p className="mt-2 text-xs text-muted-foreground">
                e.g. 16 players → 4 tables round 1. Close KO round, then roll
                next round with survivors only.
              </p>
            </label>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                Entry fee (IDR)
              </span>
              <input
                type="number"
                min={0}
                step={5000}
                value={entryFeeIdr}
                onChange={(e) => setEntryFeeIdr(Number(e.target.value) || 0)}
                className={cn(inputClass, "font-mono")}
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                Max players
              </span>
              <input
                type="number"
                min={4}
                max={64}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value) || 16)}
                className={cn(inputClass, "font-mono")}
              />
            </label>
          </div>

          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Prize pool
            </span>
            <textarea
              value={prizePoolText}
              onChange={(e) => setPrizePoolText(e.target.value)}
              rows={2}
              className={cn(inputClass, "h-auto min-h-[4.5rem] py-2")}
              placeholder="1st Rp 2jt · 2nd Rp 1jt · …"
            />
          </label>

          <div className="rounded-xl border border-[#102A20]/10 bg-white p-3">
            <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
              <input
                type="checkbox"
                checked={revivalEnabled}
                onChange={(e) => setRevivalEnabled(e.target.checked)}
                className="size-4 accent-jade-accent"
              />
              Revival / buy-back slots
            </label>
            {revivalEnabled ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-xs">
                  Revival fee (IDR)
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={revivalFeeIdr}
                    onChange={(e) =>
                      setRevivalFeeIdr(Number(e.target.value) || 0)
                    }
                    className={cn(inputClass, "font-mono")}
                  />
                </label>
                <label className="block text-xs">
                  Max revivals / player
                  <input
                    type="number"
                    min={0}
                    max={3}
                    value={maxRevivalsPerPlayer}
                    onChange={(e) =>
                      setMaxRevivalsPerPlayer(Number(e.target.value) || 0)
                    }
                    className={cn(inputClass, "font-mono")}
                  />
                </label>
              </div>
            ) : null}
          </div>

          <fieldset className="rounded-xl border border-[#102A20]/10 bg-white p-3">
            <legend className="px-1 font-mono text-[10px] uppercase tracking-[0.14em]">
              Panitia &amp; wasit
            </legend>
            <p className="mt-1 text-xs text-muted-foreground">
              Wasit logs / scans winning hands at live tables. Panitia is shown
              on the event hub.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                Panitia
                <select
                  value={panitiaUserId}
                  onChange={(e) => setPanitiaUserId(e.target.value)}
                  className={cn(inputClass, "font-mono text-xs")}
                >
                  <option value="">— Pilih anggota —</option>
                  {memberOptions.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs">
                Wasit (hand scanner)
                <select
                  value={wasitUserId}
                  onChange={(e) => setWasitUserId(e.target.value)}
                  className={cn(inputClass, "font-mono text-xs")}
                >
                  <option value="">— Pilih anggota —</option>
                  {memberOptions.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-[#102A20]/10 bg-white p-3">
            <legend className="px-1 font-mono text-[10px] uppercase tracking-[0.14em]">
              Rules PDF
            </legend>
            <TournamentRulesUpload
              selectedFile={pdfFile}
              onSelectFile={(file) => {
                setPdfFile(file)
                if (file) {
                  setRulesPdfUrl("")
                  setRulesPdfName(file.name)
                } else {
                  setRulesPdfName(null)
                }
              }}
              disabled={pending}
            />
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Or paste direct PDF URL only (not Google Drive)
            </p>
            {externalLinkInfo && !externalLinkInfo.embeddable ? (
              <p className="mt-2 text-xs text-jade-gold">{externalLinkInfo.hint}</p>
            ) : null}
            <input
              value={rulesPdfUrl}
              onChange={(e) => {
                setRulesPdfUrl(e.target.value)
                setPdfFile(null)
              }}
              placeholder="https://…/zung-jung-rules.pdf"
              className={cn(inputClass, "font-mono text-xs")}
              disabled={Boolean(pdfFile)}
            />
            {previewUrl ? (
              <div className="mt-3">
                <TournamentRulesPdfPanel
                  rulesPdfUrl={previewUrl}
                  rulesPdfName={rulesPdfName ?? pdfFile?.name}
                />
              </div>
            ) : null}
          </fieldset>

          {error ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-jade-red">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="tap-press inline-flex h-12 w-full items-center justify-center bg-jade-accent font-mono text-[11px] uppercase tracking-[0.16em] text-white disabled:opacity-50"
          >
            {pending ? "Publishing…" : "Publish tournament"}
          </button>
        </form>
      </div>
    </div>
  )
}