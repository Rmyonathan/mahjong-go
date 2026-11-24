/**
 * Cache-bust when `public/tiles` is regenerated from `public/new tiles`.
 * Bump after running `node scripts/process-tiles.mjs`.
 */
export const TILE_IMAGE_VERSION = "20261124c"

/** Public URL for a tile face JPEG in `public/tiles`. */
export function tileImageSrc(imagePath: string) {
  return `/tiles/${encodeURIComponent(imagePath)}?v=${TILE_IMAGE_VERSION}`
}
