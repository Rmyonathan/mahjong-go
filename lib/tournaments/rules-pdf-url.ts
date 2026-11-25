/** Hosts that block cross-origin iframe embedding (X-Frame-Options / CSP). */
const NON_EMBEDDABLE_HOSTS = [
  "drive.google.com",
  "docs.google.com",
  "dropbox.com",
  "www.dropbox.com",
]

export function extractGoogleDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([^/]+)/,
    /[?&]id=([^&]+)/,
    /\/open\?id=([^&]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

export type RulesPdfLinkInfo = {
  /** Best URL for open / download in browser */
  href: string
  /** Safe to use in <iframe src> on Jade */
  embeddable: boolean
  /** Short UI hint when not embeddable */
  hint: string | null
}

/**
 * Normalize external rules links. Google Drive “anyone with link” still
 * cannot be shown inside an iframe — use file upload or a direct .pdf URL.
 */
export function resolveRulesPdfLink(url: string): RulesPdfLinkInfo {
  const trimmed = url.trim()
  if (!trimmed) {
    return { href: "", embeddable: false, hint: null }
  }

  if (trimmed.startsWith("/")) {
    return { href: trimmed, embeddable: true, hint: null }
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return {
      href: trimmed,
      embeddable: false,
      hint: "Invalid URL — upload a PDF file or use a direct link ending in .pdf",
    }
  }

  const host = parsed.hostname.replace(/^www\./, "")

  if (host === "drive.google.com" || host.endsWith(".drive.google.com")) {
    const fileId = extractGoogleDriveFileId(trimmed)
    const href = fileId
      ? `https://drive.google.com/file/d/${fileId}/preview`
      : trimmed
    return {
      href,
      embeddable: false,
      hint:
        "Google Drive blocks in-page preview. Use Open in new tab, or upload the PDF file when creating the tournament (recommended).",
    }
  }

  if (host === "docs.google.com") {
    return {
      href: trimmed,
      embeddable: false,
      hint:
        "Google Docs cannot be embedded here. File → Download as PDF, then upload in the tournament form.",
    }
  }

  if (NON_EMBEDDABLE_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) {
    return {
      href: trimmed,
      embeddable: false,
      hint: "This host does not allow embedded preview. Upload the PDF or host it at a direct .pdf URL.",
    }
  }

  const pathLooksPdf =
    parsed.pathname.toLowerCase().endsWith(".pdf") ||
    parsed.searchParams.get("format") === "pdf"

  return {
    href: trimmed,
    embeddable: pathLooksPdf || parsed.protocol === "http:" || parsed.protocol === "https:",
    hint: pathLooksPdf
      ? null
      : "If preview is blank, upload the PDF file or use a direct link that ends in .pdf",
  }
}