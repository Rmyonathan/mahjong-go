import { getPartnerDashboardStats } from "@/lib/partner/stats"
import { formatQrisIdr } from "@/lib/qris"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Partner — Jade Mahjong Admin",
}

export default async function AdminPartnerPage() {
  const stats = await getPartnerDashboardStats()

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Live Postgres · {stats.monthLabel}
        </p>
        <h2 className="mt-1 font-serif text-4xl">Partner desk</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Real club counts from your database — not seed revenue fiction.
          Members = User rows, Pro = active membershipTier, commission =
          (Pros granted/renewed this month × Rp{" "}
          {stats.pricing.proAmountIdr.toLocaleString("id-ID")} ×{" "}
          {stats.pricing.proSharePct}%) + coaching bookings ×{" "}
          {stats.pricing.coachingSharePct}%. Small club → small numbers until
          real QRIS Pros land.
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Members registered"
          value={String(stats.memberCount)}
          hint="All Jade accounts"
        />
        <StatCard
          label="Active Pro this month"
          value={String(stats.activeProCount)}
          hint={`${stats.proGrantedThisMonth} granted/renewed in ${stats.monthLabel}`}
          tone="accent"
        />
        <StatCard
          label="Partner commission balance"
          value={stats.revenue.commissionBalanceLabel}
          hint={`${stats.pricing.proSharePct}% Pro month + ${stats.pricing.coachingSharePct}% audits`}
          tone="gold"
        />
      </dl>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="jade-card p-5">
          <h3 className="font-serif text-2xl">Pro revenue split</h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {stats.pricing.proAmountLabel}/mo · partner{" "}
            {stats.pricing.proSharePct}%
          </p>
          <ul className="mt-4 space-y-3 font-mono text-sm">
            <Row
              label="Live Pro MRR (gross)"
              value={formatQrisIdr(stats.revenue.proGrossIdr)}
            />
            <Row
              label={`Her cut if all renew (${stats.pricing.proSharePct}%)`}
              value={stats.revenue.proLiveMrrPartnerLabel}
            />
            <Row
              label="Granted/renewed this month (gross)"
              value={formatQrisIdr(stats.revenue.proMonthGrossIdr)}
            />
            <Row
              label="Her month Pro commission"
              value={stats.revenue.proMonthPartnerLabel}
              strong
            />
          </ul>
        </article>

        <article className="jade-card p-5">
          <h3 className="font-serif text-2xl">Coaching bookings</h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {stats.pricing.auditAmountLabel} · coach{" "}
            {stats.pricing.coachingSharePct}%
          </p>
          <ul className="mt-4 space-y-3 font-mono text-sm">
            <Row
              label={`Bookings in ${stats.monthLabel}`}
              value={String(stats.coachingBookings.length)}
            />
            <Row
              label="Pipeline gross"
              value={formatQrisIdr(stats.revenue.coachingGrossIdr)}
            />
            <Row
              label="Her coaching share"
              value={stats.revenue.coachingPartnerLabel}
              strong
            />
          </ul>
        </article>
      </section>

      <section className="jade-card-accent p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em]">
          Live balance
        </p>
        <p className="mt-2 font-serif text-4xl">
          {stats.revenue.commissionBalanceLabel}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Month Pro commission ({stats.revenue.proMonthPartnerLabel}) + coaching
          share ({stats.revenue.coachingPartnerLabel}). Manual QRIS until
          Midtrans/Xendit webhooks land — reconcile against WhatsApp confirms.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="jade-card overflow-hidden">
          <div className="border-b-[2px] border-jade-ink px-4 py-3">
            <h3 className="font-serif text-2xl">Active Pro roster</h3>
          </div>
          {stats.activePros.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No active Pro seats right now.
            </p>
          ) : (
            <ul className="divide-y divide-jade-ink/25">
              {stats.activePros.map((pro) => (
                <li
                  key={pro.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-serif text-lg leading-none">{pro.name}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {pro.email}
                      {pro.role === "ADMIN" ? " · admin" : ""}
                    </p>
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {pro.proExpiresAt
                      ? `until ${new Date(pro.proExpiresAt).toLocaleDateString("id-ID")}`
                      : "open"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="jade-card overflow-hidden">
          <div className="border-b-[2px] border-jade-ink px-4 py-3">
            <h3 className="font-serif text-2xl">Coaching queue</h3>
          </div>
          {stats.coachingAllRecent.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No hand-audit requests yet.
            </p>
          ) : (
            <ul className="divide-y divide-jade-ink/25">
              {stats.coachingAllRecent.map((booking) => (
                <li
                  key={booking.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-serif text-lg leading-none">
                      {booking.userName}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {new Date(booking.createdAt).toLocaleString("id-ID")}
                      {booking.preferredAt
                        ? ` · want ${new Date(booking.preferredAt).toLocaleString("id-ID")}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]",
                      booking.status === "DONE" &&
                        "border-jade-accent text-jade-accent",
                      booking.status === "PENDING" && "border-jade-ink",
                      booking.status === "CONFIRMED" &&
                        "border-jade-gold bg-jade-gold/30",
                      booking.status === "CANCELLED" &&
                        "border-jade-red text-jade-red",
                    )}
                  >
                    {booking.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  tone = "ink",
}: {
  label: string
  value: string
  hint: string
  tone?: "ink" | "accent" | "gold"
}) {
  return (
    <div
      className={cn(
        "border-[2px] border-jade-ink p-4",
        tone === "ink" && "bg-card",
        tone === "accent" && "bg-card shadow-[4px_4px_0_0_var(--jade-accent)]",
        tone === "gold" && "bg-jade-gold/25 shadow-[4px_4px_0_0_var(--jade-gold)]",
      )}
    >
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-2 font-mono text-3xl">{value}</dd>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {hint}
      </p>
    </div>
  )
}

function Row({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-jade-ink/20 pb-2 last:border-b-0">
      <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className={cn(strong && "text-jade-accent")}>{value}</span>
    </li>
  )
}
