# Seeded accounts (JadeMahjong)

Dev logins created by `npm run db:seed` (`prisma/seed.ts`).

| Email | Password | Name | Role | Membership | Linked player |
| --- | --- | --- | --- | --- | --- |
| `admin@jade.local` | `jade123` | Jade Admin | ADMIN | PRO | hendra-wijaya |
| `sari@jade.local` | `jade123` | Sari Lestari | MEMBER | PRO | sari-lestari |
| `andi@jade.local` | `jade123` | Andi Saputra | MEMBER | FREE | andi-saputra |
| `rina@jade.local` | `jade123` | Rina Marlina | MEMBER | FREE | rina-marlina |
| `eko@jade.local` | `jade123` | Eko Prasetyo | MEMBER | FREE | eko-prasetyo |

## Quick notes

- **Admin / club meets (unlimited scans + captain) / Set PRO 30d / Partner desk:** `admin@jade.local` / `jade123` → `/admin/accounts` · `/admin/partner`
- **Seat booking:** requests stay **PENDING** until the table host Accepts; confirmed seats cannot be self-cancelled
- **Player tables:** Free host = 3 scans · Pro host = unlimited · Club (admin) = unlimited + appoint captain
- **Pro member (early-bird + insights):** `sari@jade.local` / `jade123`
- **Free member (blurred insights · last 3 sessions · blocked early-bird):** `andi@jade.local` / `jade123`
- **Week-1 payment:** Pro/Scan = dynamic QRIS + WA app; **booking meja** = dynamic QRIS (Jade GoPay merchant, nominal dari `feeIdr`) + WA booking **+62 811-7962-211** (only club admin can set seat fee on meets)
- **Retention:** `/dashboard` bounties · `/puzzle` daily WWYD · `/coaching` videos + hand audit
- Re-seed anytime with: `npm run db:seed` (wipes and recreates seed data)

Local only — do not use these passwords in production.
