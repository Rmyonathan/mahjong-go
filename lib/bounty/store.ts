import {
  BOUNTY_CATALOG_BY_KEY,
  bountiesFromKeys,
  defaultWeeklyBounties,
} from "@/lib/bounty/catalog"
import type { WeeklyBounty } from "@/lib/bounty/weekly"
import { currentWeekKey } from "@/lib/bounty/weekly"
import { prisma } from "@/lib/db"

export type WeeklyBountyWeekRow = {
  weekKey: string
  bounties: WeeklyBounty[]
  source: "default" | "shuffle" | "ai"
  generatedAt: string
}

type WeekRowSql = {
  weekKey: string
  questsJson: unknown
  source: string
  generatedAt: Date
}

function parseQuestsJson(raw: unknown): WeeklyBounty[] {
  // Prisma Json sometimes comes back as a string
  let value: unknown = raw
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw)
    } catch {
      return defaultWeeklyBounties()
    }
  }
  if (!Array.isArray(value)) return defaultWeeklyBounties()
  const keys: string[] = []
  const overrides: Partial<Record<string, Partial<WeeklyBounty>>> = {}
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const row = item as Partial<WeeklyBounty>
    if (typeof row.key !== "string" || !BOUNTY_CATALOG_BY_KEY[row.key]) continue
    if (keys.includes(row.key)) continue
    keys.push(row.key)
    overrides[row.key] = {
      title: typeof row.title === "string" ? row.title : undefined,
      blurb: typeof row.blurb === "string" ? row.blurb : undefined,
      howTo: typeof row.howTo === "string" ? row.howTo : undefined,
      xp: typeof row.xp === "number" ? row.xp : undefined,
    }
  }
  const bounties = bountiesFromKeys(keys, overrides)
  return bounties.length > 0 ? bounties : defaultWeeklyBounties()
}

function mapRow(row: WeekRowSql): WeeklyBountyWeekRow {
  return {
    weekKey: row.weekKey,
    bounties: parseQuestsJson(row.questsJson),
    source:
      row.source === "ai"
        ? "ai"
        : row.source === "shuffle"
          ? "shuffle"
          : "default",
    generatedAt: new Date(row.generatedAt).toISOString(),
  }
}

/**
 * Raw SQL so this works even when `prisma generate` is locked by `next dev`
 * (weeklyBountyWeek missing on stale client). Table itself is already in Postgres.
 */
async function findWeek(weekKey: string): Promise<WeekRowSql | null> {
  const rows = await prisma.$queryRaw<WeekRowSql[]>`
    SELECT "weekKey", "questsJson", "source", "generatedAt"
    FROM "WeeklyBountyWeek"
    WHERE "weekKey" = ${weekKey}
    LIMIT 1
  `
  return rows[0] ?? null
}

/** Load this week's quests (DB → safe catalog parse → defaults). */
export async function getWeeklyBounties(
  weekKey = currentWeekKey(),
): Promise<WeeklyBountyWeekRow> {
  try {
    const row = await findWeek(weekKey)
    if (!row) {
      return {
        weekKey,
        bounties: defaultWeeklyBounties(),
        source: "default",
        generatedAt: new Date().toISOString(),
      }
    }
    return mapRow(row)
  } catch {
    // Table missing / client oddity — never crash the dashboard
    return {
      weekKey,
      bounties: defaultWeeklyBounties(),
      source: "default",
      generatedAt: new Date().toISOString(),
    }
  }
}

export async function saveWeeklyBounties(options: {
  weekKey: string
  bounties: WeeklyBounty[]
  source: "default" | "shuffle" | "ai"
}) {
  const sanitized = parseQuestsJson(options.bounties)
  const questsJson = JSON.stringify(sanitized)
  const id = `wbw_${options.weekKey.replace(/[^a-zA-Z0-9]/g, "_")}`

  await prisma.$executeRaw`
    INSERT INTO "WeeklyBountyWeek" ("id", "weekKey", "questsJson", "source", "generatedAt", "updatedAt")
    VALUES (${id}, ${options.weekKey}, CAST(${questsJson} AS jsonb), ${options.source}, NOW(), NOW())
    ON CONFLICT ("weekKey") DO UPDATE SET
      "questsJson" = CAST(${questsJson} AS jsonb),
      "source" = EXCLUDED."source",
      "generatedAt" = NOW(),
      "updatedAt" = NOW()
  `

  const row = await findWeek(options.weekKey)
  if (!row) {
    return {
      weekKey: options.weekKey,
      bounties: sanitized,
      source: options.source,
      generatedAt: new Date().toISOString(),
    }
  }
  return mapRow(row)
}

/** Wipe AI/custom set → fall back to default catalog trio. */
export async function resetWeeklyBounties(weekKey = currentWeekKey()) {
  await prisma.$executeRaw`
    DELETE FROM "WeeklyBountyWeek" WHERE "weekKey" = ${weekKey}
  `
  return getWeeklyBounties(weekKey)
}
