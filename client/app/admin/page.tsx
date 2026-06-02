'use client'
import { useEffect, useState } from 'react'
import { useAuthGuard } from '../narrative/hooks/useAuthGuard'

type Stats = {
  entityCount: number
  edgeCount: number
  sessionCount: number
  historyCount: number
  latestHistoryAt: string | null
}

export default function AdminPage() {
  useAuthGuard('ADMIN')
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return  // auth guard will redirect; don't race it with a fetch
    fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setStats)
  }, [])

  if (!stats) return <p>Loading…</p>

  return (
    <main>
      <h1>Admin</h1>
      <dl>
        <dt>Entities</dt><dd>{stats.entityCount}</dd>
        <dt>Edges</dt><dd>{stats.edgeCount}</dd>
        <dt>Sessions</dt><dd>{stats.sessionCount}</dd>
        <dt>History entries</dt><dd>{stats.historyCount}</dd>
        <dt>Latest history</dt><dd>{stats.latestHistoryAt ?? 'none'}</dd>
      </dl>
    </main>
  )
}
