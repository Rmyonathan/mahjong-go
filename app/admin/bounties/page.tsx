import { BountyManager } from "@/components/admin/bounty-manager"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Weekly bounties — Jade Mahjong Admin",
}

export default function AdminBountiesPage() {
  return <BountyManager />
}
