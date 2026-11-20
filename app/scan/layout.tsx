import type { Viewport } from "next"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#E8DFC8",
}

export default function ScanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="calculator-shell lg:contents">
      <div className="relative flex min-h-[100dvh] w-full touch-manipulation flex-col bg-parchment max-lg:overflow-x-hidden lg:static lg:min-h-0 lg:overflow-visible">
        {children}
      </div>
    </div>
  )
}
