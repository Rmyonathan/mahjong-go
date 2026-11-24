import {
  BOUNTY_CATALOG,
  bountiesFromKeys,
} from "@/lib/bounty/catalog"
import { saveWeeklyBounties } from "@/lib/bounty/store"
import { currentWeekKey } from "@/lib/bounty/weekly"

/**
 * Free local shuffle — pick 3 catalog quests for the week.
 * No AI / tokens. Quests stay verifiable because keys never leave the catalog.
 */
export async function shuffleWeeklyBounties(weekKey = currentWeekKey()) {
  const shuffled = [...BOUNTY_CATALOG].sort(() => Math.random() - 0.5)
  const pick = shuffled.slice(0, 3)
  const bounties = bountiesFromKeys(pick.map((t) => t.key))

  return saveWeeklyBounties({
    weekKey,
    bounties,
    source: "shuffle",
  })
}
