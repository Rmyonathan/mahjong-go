export interface PresetAvatar {
  id: string
  label: string
  glyph: string
  bgClass: string
  textClass: string
}

export interface AvatarFrame {
  id: string
  name: string
  unlockLabel: string
  minLevel?: number
  proOnly?: boolean
  /** Outer wrapper styling (ring, border, shadow, gradient) */
  frameClass: string
  /** Optional corner badge text (e.g. "★" or "龍") */
  badge?: string
  badgeClass?: string
}

export const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: "dragon-red",
    label: "Chong (中)",
    glyph: "中",
    bgClass: "bg-[#8F1D21]",
    textClass: "text-[#FFF6EA]",
  },
  {
    id: "dragon-green",
    label: "Fa Cai (發)",
    glyph: "發",
    bgClass: "bg-[#155E3F]",
    textClass: "text-[#F6F4EE]",
  },
  {
    id: "dragon-white",
    label: "Pak Phan (白)",
    glyph: "白",
    bgClass: "bg-[#F6F4EE]",
    textClass: "text-[#102A20]",
  },
  {
    id: "wind-east",
    label: "Tong (東)",
    glyph: "東",
    bgClass: "bg-[#102A20]",
    textClass: "text-[#E6C15A]",
  },
  {
    id: "wind-south",
    label: "Nan (南)",
    glyph: "南",
    bgClass: "bg-[#1D3E32]",
    textClass: "text-[#F6F4EE]",
  },
  {
    id: "wind-west",
    label: "Xi (西)",
    glyph: "西",
    bgClass: "bg-[#2C3E50]",
    textClass: "text-[#F6F4EE]",
  },
  {
    id: "wind-north",
    label: "Pei (北)",
    glyph: "北",
    bgClass: "bg-[#3D2B1F]",
    textClass: "text-[#F4E3B2]",
  },
  {
    id: "jade-tile",
    label: "Jade Tile (玉)",
    glyph: "玉",
    bgClass: "bg-gradient-to-br from-[#16794C] to-[#0E3A28]",
    textClass: "text-[#F5E7B8]",
  },
  {
    id: "lotus",
    label: "Lotus (蓮)",
    glyph: "蓮",
    bgClass: "bg-gradient-to-br from-[#B5446E] to-[#6E1D3B]",
    textClass: "text-[#FFF5F7]",
  },
]

export const AVATAR_FRAMES: AvatarFrame[] = [
  {
    id: "classic",
    name: "Classic Ink",
    unlockLabel: "Starter",
    frameClass:
      "border-[2px] border-jade-ink shadow-[3px_3px_0_0_var(--jade-ink)]",
  },
  {
    id: "bamboo",
    name: "Bamboo Seal",
    unlockLabel: "Starter",
    frameClass:
      "border-[2px] border-[#16794C] ring-2 ring-[#16794C]/30 shadow-[3px_3px_0_0_#16794C]",
  },
  {
    id: "parchment",
    name: "Parchment Gold",
    unlockLabel: "Starter",
    frameClass:
      "border-[2px] border-[#B6892B] ring-2 ring-[#E6C15A]/45 shadow-[3px_3px_0_0_#102A20]",
  },
  {
    id: "menengah",
    name: "Steady Tile",
    unlockLabel: "LV 21+",
    minLevel: 21,
    frameClass:
      "border-[2px] border-[#2563EB] ring-2 ring-[#60A5FA]/40 shadow-[3px_3px_0_0_#1E3A8A]",
    badge: "21",
    badgeClass: "bg-[#1E3A8A] text-white",
  },
  {
    id: "mahir",
    name: "Mahir Jade",
    unlockLabel: "LV 41+",
    minLevel: 41,
    frameClass:
      "border-[2px] border-[#0E6B47] ring-2 ring-[#34D399]/50 shadow-[0_0_0_2px_#102A20,4px_4px_0_0_#0E6B47]",
    badge: "巧",
    badgeClass: "bg-[#0E6B47] text-[#F5E7B8]",
  },
  {
    id: "ahli",
    name: "Ahli Crimson",
    unlockLabel: "LV 51+",
    minLevel: 51,
    frameClass:
      "border-[2px] border-[#991B1B] ring-2 ring-[#F87171]/50 shadow-[0_0_0_2px_#102A20,4px_4px_0_0_#991B1B]",
    badge: "將",
    badgeClass: "bg-[#991B1B] text-[#FFF5E6]",
  },
  {
    id: "master",
    name: "Master Crown",
    unlockLabel: "LV 61+",
    minLevel: 61,
    frameClass:
      "border-[2px] border-[#D97706] ring-2 ring-[#FBBF24]/60 shadow-[0_0_12px_rgba(245,158,11,0.45),3px_3px_0_0_#102A20]",
    badge: "王",
    badgeClass: "bg-[#102A20] text-[#FBBF24]",
  },
  {
    id: "pro-gold",
    name: "Imperial Gold",
    unlockLabel: "PRO",
    proOnly: true,
    frameClass:
      "border-[2px] border-[#C99A2E] ring-[3px] ring-[#F5D061]/65 shadow-[0_0_14px_rgba(201,154,46,0.55)]",
    badge: "PRO",
    badgeClass: "bg-gradient-to-r from-[#C99A2E] to-[#9E7214] text-white",
  },
  {
    id: "pro-jade",
    name: "Jade Dragon",
    unlockLabel: "PRO",
    proOnly: true,
    frameClass:
      "border-[2px] border-[#16794C] ring-[3px] ring-[#4ADE80]/55 shadow-[0_0_14px_rgba(22,121,76,0.5)]",
    badge: "龍",
    badgeClass: "bg-[#16794C] text-[#F5E7B8]",
  },
  {
    id: "pro-ruby",
    name: "Ruby Blossom",
    unlockLabel: "PRO",
    proOnly: true,
    frameClass:
      "border-[2px] border-[#9F1239] ring-[3px] ring-[#FB7185]/55 shadow-[0_0_14px_rgba(190,18,60,0.45)]",
    badge: "花",
    badgeClass: "bg-[#9F1239] text-white",
  },
]

export function getAvatarFrame(frameId?: string | null): AvatarFrame {
  return (
    AVATAR_FRAMES.find((f) => f.id === frameId) ?? AVATAR_FRAMES[0]!
  )
}

export function getPresetAvatar(avatarUrl?: string | null): PresetAvatar | null {
  if (!avatarUrl || !avatarUrl.startsWith("preset:")) return null
  const id = avatarUrl.slice("preset:".length)
  return PRESET_AVATARS.find((p) => p.id === id) ?? null
}

export function isFrameUnlocked(
  frame: AvatarFrame,
  opts: { level: number; isPro: boolean },
): boolean {
  if (frame.proOnly && !opts.isPro) return false
  if (typeof frame.minLevel === "number" && opts.level < frame.minLevel) {
    return false
  }
  return true
}

const MAX_DATA_URL_CHARS = 220_000

export function isValidAvatarValue(value: string | null | undefined): boolean {
  if (value == null || value === "") return true
  if (value.startsWith("preset:")) {
    const id = value.slice("preset:".length)
    return PRESET_AVATARS.some((p) => p.id === id)
  }
  if (value.startsWith("data:image/")) {
    return value.length <= MAX_DATA_URL_CHARS
  }
  return false
}
