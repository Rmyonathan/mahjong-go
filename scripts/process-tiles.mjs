/**
 * Process `public/new tiles` → `public/tiles`:
 * - exact 3:4 center crop
 * - mild shared brightness lift (keep contrast)
 * - high-quality web JPEG
 *
 * Run: node scripts/process-tiles.mjs
 */
import fs from "node:fs"
import path from "node:path"
import sharp from "sharp"

const ROOT = path.resolve(import.meta.dirname, "..")
const SRC = path.join(ROOT, "public", "new tiles")
const DEST = path.join(ROOT, "public", "tiles")

const RATIO = 3 / 4
const OUT_W = 900
const OUT_H = 1200
/** Mild lift only — avoid washing contrast into “old dull” look. */
const TARGET_MEAN = 205

function centerCrop(width, height) {
  if (width / height > RATIO) {
    const cropW = Math.round(height * RATIO)
    return {
      left: Math.round((width - cropW) / 2),
      top: 0,
      width: cropW,
      height,
    }
  }
  const cropH = Math.round(width / RATIO)
  return {
    left: 0,
    top: Math.round((height - cropH) / 2),
    width,
    height: cropH,
  }
}

async function processFile(name) {
  const input = path.join(SRC, name)
  const output = path.join(DEST, name)
  const meta = await sharp(input, { failOn: "none" }).metadata()
  if (!meta.width || !meta.height) {
    throw new Error(`No dimensions for ${name}`)
  }

  const region = centerCrop(meta.width, meta.height)
  const cropped = sharp(input, { failOn: "none" }).extract(region)
  const stats = await cropped.clone().stats()
  const mean =
    (stats.channels[0].mean +
      stats.channels[1].mean +
      stats.channels[2].mean) /
    3
  // Cap lift so dark ink stays punchy
  const brightness = Math.min(1.12, Math.max(0.95, TARGET_MEAN / mean))

  await cropped
    .resize(OUT_W, OUT_H, { fit: "fill", kernel: "lanczos3" })
    .modulate({ brightness })
    .sharpen({ sigma: 0.6 })
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(output)

  return { name, mean: mean.toFixed(1), brightness: brightness.toFixed(3) }
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error("Missing folder:", SRC)
    process.exit(1)
  }
  fs.mkdirSync(DEST, { recursive: true })

  const files = fs
    .readdirSync(SRC)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort()

  console.log(`Processing ${files.length} tiles → ${DEST}`)
  for (const file of files) {
    const result = await processFile(file)
    console.log(
      `✓ ${result.name}  mean=${result.mean}  bright×${result.brightness}`,
    )
  }
  console.log("Done.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
