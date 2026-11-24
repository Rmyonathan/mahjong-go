import type { RuleVariant } from "@/lib/mahjong/types"

/**
 * House hitungan — only two live presets for now.
 * EDIT HERE — add Indo/Hokkien later without breaking Chicken / Jade HK.
 */
export const RULESET_OPTIONS: {
  id: RuleVariant
  label: string
  shortLabel: string
  summaryId: string
  summaryEn: string
  minFan: number
}[] = [
  {
    id: "chicken",
    label: "Chicken Hand",
    shortLabel: "Chicken",
    summaryId:
      "Tangan ayam diizinkan — menang dengan 0 Faan tetap sah (base 1.000 Jade Miles).",
    summaryEn:
      "Chicken hands allowed — a valid 0-Faan win still scores (base 1.000 Jade Miles).",
    minFan: 0,
  },
  {
    id: "jade-hk",
    label: "Jade HK (Modified)",
    shortLabel: "Jade HK",
    summaryId:
      "Hitungan resmi Jade — min. 1 Faan, combo Section 5, limit 10 Faan = 64.000.",
    summaryEn:
      "Official Jade table — min 1 Faan, Section 5 combos, limit 10 Faan = 64.000.",
    minFan: 1,
  },
]

export function rulesetMeta(variant: RuleVariant) {
  return (
    RULESET_OPTIONS.find((row) => row.id === variant) ?? RULESET_OPTIONS[1]!
  )
}

export function minFanForRuleset(variant: RuleVariant): number {
  return rulesetMeta(variant).minFan
}

/** Prisma / API enum ↔ engine id */
export function rulesetFromDb(
  value: string | null | undefined,
): RuleVariant {
  if (value === "CHICKEN" || value === "chicken") return "chicken"
  if (value === "JADE_HK" || value === "jade-hk") return "jade-hk"
  // Legacy aliases
  if (value === "hokkien" || value === "hong-kong-old-style") return "jade-hk"
  return "jade-hk"
}

export function rulesetToDb(variant: RuleVariant): "CHICKEN" | "JADE_HK" {
  return variant === "chicken" ? "CHICKEN" : "JADE_HK"
}
