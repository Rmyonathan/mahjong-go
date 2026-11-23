import {
  HAND_AUDIT_PRICE_IDR,
} from "@/lib/coaching/content"
import { prisma } from "@/lib/db"
import { isProMembership } from "@/lib/membership"
import { PRO_AMOUNT_IDR } from "@/lib/pro-payment"
import { formatQrisIdr } from "@/lib/qris"

/** EDIT HERE — partner share of Pro net revenue */
export const PARTNER_PRO_SHARE = 0.5

/** EDIT HERE — coach share of hand-audit fee (matches coaching card) */
export const PARTNER_COACHING_SHARE = 0.8

function monthBoundsJakarta(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date)
  const y = parts.find((p) => p.type === "year")?.value ?? "2026"
  const m = parts.find((p) => p.type === "month")?.value ?? "01"
  const start = new Date(`${y}-${m}-01T00:00:00+07:00`)
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)
  return {
    start,
    end,
    label: start.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }),
  }
}

/**
 * Approximate Pro grant start: proExpiresAt − 30 days (admin Set PRO · 30d).
 * Falls back to updatedAt when expiry missing.
 */
function proGrantStart(user: {
  proExpiresAt: Date | null
  updatedAt: Date
}) {
  if (user.proExpiresAt) {
    const start = new Date(user.proExpiresAt)
    start.setDate(start.getDate() - 30)
    return start
  }
  return user.updatedAt
}

export async function getPartnerDashboardStats() {
  const { start, end, label: monthLabel } = monthBoundsJakarta()

  const [memberCount, users, bookings] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        membershipTier: true,
        proExpiresAt: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coachingBooking.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
  ])

  const activePros = users.filter((user) => isProMembership(user))
  const proGrantedThisMonth = activePros.filter((user) => {
    const granted = proGrantStart(user)
    return granted >= start && granted < end
  })

  // Live monthly Pro pool: active Pros × Rp 29k (QRIS month fee)
  const proGrossIdr = activePros.length * PRO_AMOUNT_IDR
  const proPartnerCommissionIdr = Math.round(proGrossIdr * PARTNER_PRO_SHARE)

  // This-month Pro cash-in proxy (new/renewed grants)
  const proMonthGrossIdr = proGrantedThisMonth.length * PRO_AMOUNT_IDR
  const proMonthPartnerIdr = Math.round(proMonthGrossIdr * PARTNER_PRO_SHARE)

  const monthBookings = bookings.filter(
    (b) => b.createdAt >= start && b.createdAt < end,
  )
  const billableBookings = monthBookings.filter(
    (b) => b.status === "CONFIRMED" || b.status === "DONE" || b.status === "PENDING",
  )
  const coachingGrossIdr = billableBookings.length * HAND_AUDIT_PRICE_IDR
  const coachingPartnerIdr = Math.round(
    coachingGrossIdr * PARTNER_COACHING_SHARE,
  )

  const commissionBalanceIdr = proMonthPartnerIdr + coachingPartnerIdr

  return {
    monthLabel,
    memberCount,
    activeProCount: activePros.length,
    proGrantedThisMonth: proGrantedThisMonth.length,
    pricing: {
      proAmountIdr: PRO_AMOUNT_IDR,
      proAmountLabel: formatQrisIdr(PRO_AMOUNT_IDR),
      auditAmountIdr: HAND_AUDIT_PRICE_IDR,
      auditAmountLabel: formatQrisIdr(HAND_AUDIT_PRICE_IDR),
      proSharePct: Math.round(PARTNER_PRO_SHARE * 100),
      coachingSharePct: Math.round(PARTNER_COACHING_SHARE * 100),
    },
    revenue: {
      proGrossIdr,
      proPartnerCommissionIdr,
      proMonthGrossIdr,
      proMonthPartnerIdr,
      coachingGrossIdr,
      coachingPartnerIdr,
      commissionBalanceIdr,
      commissionBalanceLabel: formatQrisIdr(commissionBalanceIdr),
      proMonthPartnerLabel: formatQrisIdr(proMonthPartnerIdr),
      coachingPartnerLabel: formatQrisIdr(coachingPartnerIdr),
      proLiveMrrPartnerLabel: formatQrisIdr(proPartnerCommissionIdr),
    },
    activePros: activePros.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      proExpiresAt: user.proExpiresAt?.toISOString() ?? null,
    })),
    coachingBookings: monthBookings.map((b) => ({
      id: b.id,
      status: b.status,
      notes: b.notes,
      sessionId: b.sessionId,
      preferredAt: b.preferredAt?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
      userName: b.user.name,
      userEmail: b.user.email,
    })),
    coachingAllRecent: bookings.slice(0, 12).map((b) => ({
      id: b.id,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
      userName: b.user.name,
      preferredAt: b.preferredAt?.toISOString() ?? null,
    })),
  }
}

export type PartnerDashboardStats = Awaited<
  ReturnType<typeof getPartnerDashboardStats>
>
