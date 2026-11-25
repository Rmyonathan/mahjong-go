# Seeded accounts (JadeMahjong)

Dev logins created by `npm run db:seed` (`prisma/seed.ts`).

| Email | Password | Name | Role | Membership | Linked player |
| --- | --- | --- | --- | --- | --- |
| `admin@jade.local` | `jade123` | Jade Admin | ADMIN | PRO | hendra-wijaya |
| `sari@jade.local` | `jade123` | Sari Lestari | MEMBER | PRO | sari-lestari |
| `andi@jade.local` | `jade123` | Andi Saputra | MEMBER | FREE | andi-saputra |
| `rina@jade.local` | `jade123` | Rina Marlina | MEMBER | FREE | rina-marlina |
| `eko@jade.local` | `jade123` | Eko Prasetyo | MEMBER | FREE | eko-prasetyo |
| `dewi@jade.local` | `jade123` | Dewi Anggraini | MEMBER | FREE | dewi-anggraini |
| `bambang@jade.local` | `jade123` | Bambang Sutopo | MEMBER | FREE | bambang-sutopo |
| `yudi@jade.local` | `jade123` | Yudi Kurniawan | MEMBER | PRO | yudi-kurniawan |

## Quick notes

- **Admin / club meets (unlimited scans + captain) / Set PRO 30d / Partner desk:** `admin@jade.local` / `jade123` → `/admin/accounts` · `/admin/partner`
- **Seat booking:** requests stay **PENDING** until the table host Accepts; confirmed seats cannot be self-cancelled
- **Player tables:** Free host = 3 scans · Pro host = unlimited · Club (admin) = unlimited + appoint captain
- **Pro member (early-bird + insights):** `sari@jade.local` / `jade123`
- **Free member (blurred insights · last 3 sessions · blocked early-bird):** `andi@jade.local` / `jade123`
- **Tournament panitia / wasit:** assign **multiple** on the hub (**Assign** → checkboxes). Wasit open **Live tables** → **Open live table** for the full `/session/live` UI (hands sync to standings).
- **Week-1 payment:** Pro/Scan = dynamic QRIS + WA app; **booking meja** = dynamic QRIS (Jade GoPay merchant, nominal dari `feeIdr`) + WA booking **+62 811-7962-211** (only club admin can set seat fee on meets)
- **Retention:** `/dashboard` bounties · `/puzzle` daily WWYD · `/coaching` videos + hand audit
- Re-seed anytime with: `npm run db:seed` (refreshes demo meets + dev logins; **does not** delete live sessions, tournaments, or inject mock leaderboard rows)
- **KO one-table test (4 hands, not full bracket):** on hub **Live tables** (dev only): **Sim 1 hand** / **Sim 4 hands · this table** for the selected table only. Or CLI: `npm run sim:ko-table` / `npx tsx scripts/simulate-tournament-table-hands.ts <tournamentId> <tableId>` · `--finish` ends the session ledger.

Local only — do not use these passwords in production.
