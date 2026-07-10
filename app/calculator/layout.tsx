import type { Viewport } from "next"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020617",
}

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="calculator-shell lg:contents">
      {/* Jangan pakai fixed inset-0 di mobile — iOS Safari mematikan sentuhan di dalamnya */}
      <div className="relative flex min-h-[100dvh] w-full touch-manipulation flex-col bg-slate-950 max-lg:overflow-x-hidden lg:static lg:min-h-0 lg:overflow-visible">
        {children}
      </div>
    </div>
  )
}
