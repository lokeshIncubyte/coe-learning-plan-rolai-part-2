'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthGuard } from '../narrative/hooks/useAuthGuard'
import { UploadPanel } from '../upload/components/UploadPanel'

type Stats = {
  entityCount: number
  edgeCount: number
  sessionCount: number
  historyCount: number
  latestHistoryAt: string | null
}

export default function AdminPage() {
  useAuthGuard('ADMIN')
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [spec, setSpec] = useState<object | null>(null)
  const [specText, setSpecText] = useState<string>('')
  const [saved, setSaved] = useState(false)
  const [specError, setSpecError] = useState<string | null>(null)
  const [saveJsonError, setSaveJsonError] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return  // auth guard will redirect; don't race it with a fetch
    fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setStats)
    fetch('/api/config/update-spec', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load spec (${r.status})`)
        return r.json()
      })
      .then((data) => {
        setSpec(data)
        setSpecText(JSON.stringify(data, null, 2))
      })
      .catch((err: unknown) => setSpecError(err instanceof Error ? err.message : 'Failed to load spec'))
  }, [])

  if (!stats) return <p className="p-8 text-slate-500">Loading…</p>

  const rows: [string, string][] = [
    ['Entities', String(stats.entityCount)],
    ['Edges', String(stats.edgeCount)],
    ['Sessions', String(stats.sessionCount)],
    ['History entries', String(stats.historyCount)],
    ['Latest history', stats.latestHistoryAt ?? 'none'],
  ]

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    router.push('/login')
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Admin</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
        >
          Log out
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map(([label, value]) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{label}</p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
          </div>
        ))}
      </div>
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Lore Upload</h2>
        <UploadPanel />
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Update Spec</h2>
        {specError && <p className="text-red-600 text-sm mb-2">{specError}</p>}
        {!spec && !specError && <p className="text-slate-400 text-sm">Loading spec…</p>}
        {spec && (
          <>
            <textarea
              aria-label="Update spec JSON"
              className="w-full h-64 font-mono text-sm border rounded p-2"
              value={specText}
              onChange={(e) => { setSpecText(e.target.value); setSaveJsonError(false) }}
            />
            <div className="mt-2 flex items-center gap-4">
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                onClick={async () => {
                  let parsed: object
                  try { parsed = JSON.parse(specText) } catch {
                    setSaveJsonError(true)
                    return
                  }
                  const token = localStorage.getItem('accessToken') ?? ''
                  const res = await fetch('/api/config/update-spec', {
                    method: 'PUT',
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(parsed),
                  })
                  if (res.ok) {
                    setSaved(true)
                    setTimeout(() => setSaved(false), 2000)
                  }
                }}
              >
                Save Spec
              </button>
              {saveJsonError && <span className="text-red-600 text-sm">Invalid JSON</span>}
              {saved && <span>Saved!</span>}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
