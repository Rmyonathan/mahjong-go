"use client"

import { useEffect, useState } from "react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "jade-pwa-install-dismissed"

function isIosSafari() {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  const webkit = /WebKit/.test(ua)
  const notChrome = !/CriOS|FxiOS|EdgiOS/.test(ua)
  return iOS && webkit && notChrome
}

function isStandalone() {
  if (typeof window === "undefined") return true
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  )
  const [showIosHint, setShowIosHint] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silent — SW optional on unsupported hosts / HTTP
    })
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isStandalone()) return
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)

    if (isIosSafari()) {
      setShowIosHint(true)
      setVisible(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
    }
  }, [])

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1")
    setVisible(false)
    setDeferred(null)
    setShowIosHint(false)
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    dismiss()
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] px-3 md:bottom-6 md:left-auto md:right-6 md:max-w-sm md:px-0"
      role="dialog"
      aria-label="Install Jade Mahjong"
    >
      <div className="rounded-2xl border border-[#102A20]/15 bg-[#F6F4EE] p-4 shadow-lg">
        <p className="font-serif text-lg text-jade-ink">
          Install Jade Mahjong App
        </p>
        {showIosHint && !deferred ? (
          <p className="mt-2 text-sm text-muted-foreground">
            On iPhone: tap Share →{" "}
            <span className="font-medium text-foreground">Add to Home Screen</span>
            .
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Add the house app for faster live tables and offline tile faces.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {deferred ? (
            <button
              type="button"
              onClick={() => void install()}
              className="tap-press h-10 rounded-full bg-jade-accent px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white"
            >
              Install
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className="h-10 rounded-full border border-[#102A20]/15 px-4 font-mono text-[10px] uppercase tracking-[0.14em]"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
