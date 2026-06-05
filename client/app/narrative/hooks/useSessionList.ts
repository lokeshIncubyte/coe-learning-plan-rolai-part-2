import { useEffect, useState, useCallback } from 'react'

export type SessionMeta = {
  id: string
  createdAt: string
}

export type SessionBeat = {
  narrative: string
}

export function useSessionList(currentSessionId: string | null) {
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedBeats, setSelectedBeats] = useState<SessionBeat[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchSessions = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') ?? '' : ''
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/session', { headers: { Authorization: 'Bearer ' + token } })
      if (res.ok) setSessions(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  useEffect(() => {
    if (currentSessionId && !sessions.find(s => s.id === currentSessionId)) {
      fetchSessions()
    }
  }, [currentSessionId, sessions, fetchSessions])

  const selectSession = useCallback(async (id: string) => {
    setSelectedId(id)
    setSelectedBeats([])
    setHistoryLoading(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') ?? '' : ''
    try {
      const res = await fetch('/api/session/' + id + '/history', {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedBeats((data.history ?? []).map((h: { narrative: string }) => ({ narrative: h.narrative })))
      }
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  return { sessions, loading, selectedId, selectedBeats, historyLoading, selectSession, fetchSessions }
}
