import { toPng } from "html-to-image"

export async function captureNodePng(
  node: HTMLElement,
  fileName: string,
): Promise<{ blob: Blob; dataUrl: string; file: File }> {
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#F4F0E6",
  })
  const blob = await (await fetch(dataUrl)).blob()
  const file = new File([blob], fileName, { type: "image/png" })
  return { blob, dataUrl, file }
}

export async function shareOrDownloadImage(options: {
  node: HTMLElement
  fileName: string
  title: string
  text?: string
}) {
  const { file, dataUrl } = await captureNodePng(options.node, options.fileName)

  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      navigator.canShare?.({ files: [file] })
    ) {
      await navigator.share({
        files: [file],
        title: options.title,
        text: options.text,
      })
      return "shared" as const
    }
  } catch {
    /* fall through to download */
  }

  const anchor = document.createElement("a")
  anchor.href = dataUrl
  anchor.download = options.fileName
  anchor.click()
  return "downloaded" as const
}
