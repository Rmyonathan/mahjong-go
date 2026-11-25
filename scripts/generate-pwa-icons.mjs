/**
 * Resize public/jade.png into crisp PWA icons.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { mkdir } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { Jimp } from "jimp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const source = path.join(root, "public", "jade.png")
const outDir = path.join(root, "public", "icons")

await mkdir(outDir, { recursive: true })

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
]

for (const { name, size } of sizes) {
  const image = await Jimp.read(source)
  image.resize({ w: size, h: size })
  const outPath = path.join(outDir, name)
  await image.write(outPath)
  console.log("Wrote", outPath)
}

console.log("PWA icons ready.")
