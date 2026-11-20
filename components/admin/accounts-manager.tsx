"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

interface UserRow {
  id: string
  email: string
  name: string
  role: "ADMIN" | "MEMBER"
  playerId: string | null
  createdAt: string
  player: { nickname: string; name: string } | null
}

interface PlayerOption {
  id: string
  name: string
  nickname: string
}

export function AccountsManager({
  initialUsers,
  players,
}: {
  initialUsers: UserRow[]
  players: PlayerOption[]
}) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "MEMBER" as "ADMIN" | "MEMBER",
    playerId: "",
  })

  async function refresh() {
    const response = await fetch("/api/admin/users")
    if (!response.ok) return
    const data = (await response.json()) as { users: UserRow[] }
    setUsers(
      data.users.map((user) => ({
        ...user,
        createdAt:
          typeof user.createdAt === "string"
            ? user.createdAt
            : new Date(user.createdAt).toISOString(),
      })),
    )
    router.refresh()
  }

  async function createUser(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          playerId: form.playerId || null,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Create failed")
        return
      }
      setForm({ name: "", email: "", password: "", role: "MEMBER", playerId: "" })
      await refresh()
    } finally {
      setPending(false)
    }
  }

  async function removeUser(id: string) {
    if (!confirm("Delete this account?")) return
    setError(null)
    const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    const data = (await response.json()) as { error?: string }
    if (!response.ok) {
      setError(data.error ?? "Delete failed")
      return
    }
    await refresh()
  }

  async function toggleRole(user: UserRow) {
    const role = user.role === "ADMIN" ? "MEMBER" : "ADMIN"
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    if (!response.ok) {
      const data = (await response.json()) as { error?: string }
      setError(data.error ?? "Update failed")
      return
    }
    await refresh()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="jade-card overflow-hidden">
        <div className="border-b-[2px] border-jade-ink px-4 py-3">
          <h2 className="font-serif text-2xl">Accounts</h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {users.length} users in JadeMahjong
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead className="bg-jade-ink font-mono text-[10px] uppercase tracking-[0.14em] text-parchment">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-jade-ink/25 last:border-b-0">
                  <td className="px-3 py-3 font-serif text-lg leading-none">{user.name}</td>
                  <td className="px-3 py-3 font-mono text-xs">{user.email}</td>
                  <td className="px-3 py-3 font-mono text-[10px] uppercase tracking-[0.12em]">
                    {user.role}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {user.player?.nickname ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => toggleRole(user)}
                        className="border border-jade-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
                      >
                        Role
                      </button>
                      <button
                        type="button"
                        onClick={() => removeUser(user.id)}
                        className="border border-jade-red px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-jade-red"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="jade-card-accent p-4">
        <h2 className="font-serif text-2xl">Create account</h2>
        <form onSubmit={createUser} className="mt-4 space-y-3">
          <Field
            label="Name"
            value={form.name}
            onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
          />
          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
          />
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">Role</span>
            <select
              value={form.role}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  role: event.target.value as "ADMIN" | "MEMBER",
                }))
              }
              className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-parchment px-2"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
              Linked player
            </span>
            <select
              value={form.playerId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, playerId: event.target.value }))
              }
              className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-parchment px-2"
            >
              <option value="">None</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} ({player.nickname})
                </option>
              ))}
            </select>
          </label>
          {error ? (
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-jade-red">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="scan-cta inline-flex h-10 w-full items-center justify-center rounded-none font-mono text-[11px] uppercase tracking-[0.16em] disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create account"}
          </button>
        </form>
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em]">{label}</span>
      <input
        type={type}
        required
        minLength={type === "password" ? 6 : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full border-[2px] border-jade-ink bg-parchment px-3 outline-none"
      />
    </label>
  )
}
