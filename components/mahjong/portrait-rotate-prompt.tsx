import { RotateCw, Smartphone } from "lucide-react"

export function PortraitRotatePrompt() {
  return (
    <div
      className="fixed inset-0 z-[100] hidden flex-col items-center justify-center bg-slate-950 px-8 text-center text-slate-100 max-lg:portrait:flex lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rotate-prompt-title"
    >
      <div className="mb-6 grid size-20 place-items-center rounded-2xl border border-slate-700/60 bg-slate-900/80">
        <Smartphone className="size-10 text-blue-400" />
      </div>
      <h1 id="rotate-prompt-title" className="text-xl font-bold">
        Putar Perangkat Anda
      </h1>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
        Kalkulator Mahjong-Go dirancang untuk mode lanskap. Putar ponsel ke
        samping untuk melanjutkan.
      </p>
      <div className="mt-8 flex items-center gap-2 text-sm text-blue-300">
        <RotateCw className="size-4 animate-pulse" aria-hidden />
        <span>Mode lanskap diperlukan</span>
      </div>
    </div>
  )
}
