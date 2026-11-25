"use client"

import { useState } from "react"

import { TournamentRulesPdfPanel } from "@/components/tournaments/tournament-rules-pdf-panel"
import { TournamentRulesUpload } from "@/components/tournaments/tournament-rules-upload"

export function TournamentRulesReplace({
  tournamentId,
  rulesPdfUrl,
  rulesPdfName,
  canEdit,
  onUpdated,
}: {
  tournamentId: string
  rulesPdfUrl: string | null
  rulesPdfName: string | null
  canEdit: boolean
  onUpdated: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveUpload() {
    if (!file) return
    setPending(true)
    setError(null)
    try {
      const form = new FormData()
      form.set("tournamentId", tournamentId)
      form.set("file", file)
      const response = await fetch(`/api/tournaments/actions/attach-rules-pdf`, {
        method: "POST",
        body: form,
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Upload failed")
        return
      }
      setFile(null)
      onUpdated()
    } catch {
      setError("Network error")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4">
      {rulesPdfUrl ? (
        <TournamentRulesPdfPanel
          rulesPdfUrl={rulesPdfUrl}
          rulesPdfName={rulesPdfName}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No rules PDF yet — upload one below.
        </p>
      )}
      {canEdit ? (
        <details
          className="rounded-xl border border-[#102A20]/10 bg-white p-4"
          open={!rulesPdfUrl}
        >
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {rulesPdfUrl ? "Replace rules PDF" : "Add rules PDF"}
          </summary>
          <TournamentRulesUpload
            selectedFile={file}
            onSelectFile={setFile}
            disabled={pending}
            className="mt-3"
          />
          {error ? (
            <p className="mt-2 font-mono text-[10px] uppercase text-jade-red">
              {error}
            </p>
          ) : null}
          {file ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => void saveUpload()}
              className="tap-press mt-3 h-11 w-full rounded-full bg-jade-accent font-mono text-[10px] uppercase tracking-[0.14em] text-white disabled:opacity-50"
            >
              {pending ? "Uploading…" : "Save PDF to tournament"}
            </button>
          ) : null}
        </details>
      ) : null}
    </div>
  )
}