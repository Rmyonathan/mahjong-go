import { redirect } from "next/navigation"

import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db"

/** Shortcut: logged-in member → their player profile. */
export default async function MyProfileRedirectPage() {
  const session = await getSessionUser()
  if (!session) {
    redirect("/login?next=/me")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { playerId: true },
  })

  if (!user?.playerId) {
    redirect("/login?tab=register&next=/me")
  }

  redirect(`/players/${user.playerId}`)
}
