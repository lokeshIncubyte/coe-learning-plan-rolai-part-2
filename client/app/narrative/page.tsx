'use client'

import { useEffect, useRef, useState } from 'react'
import { useStreamState } from './hooks/useStreamState'
import { useStream } from './hooks/useStream'
import { useNarrativeHistory } from './hooks/useNarrativeHistory'
import { useSessionList } from './hooks/useSessionList'
import { useAuthGuard } from './hooks/useAuthGuard'
import { ActionInput } from './components/ActionInput'
import { StreamingText } from './components/StreamingText'
import { ChoiceList } from './components/ChoiceList'
import { BeatHistory } from './components/BeatHistory'
import { ValidationFeedback } from './components/ValidationFeedback'
import { RetryButton } from './components/RetryButton'
import { SessionSidebar } from './components/SessionSidebar'
import type { Beat } from './hooks/useNarrativeHistory'

export default function NarrativePage() {
  useAuthGuard()
  const { status, narrativeText, choices, errorMessage, dispatch } = useStreamState()
  const { beats, addBeat, setChosenAction, resetBeats, sessionId, setSessionId } = useNarrativeHistory()
  const { sessions, loading: sessionsLoading, selectedId, selectedBeats, historyLoading, selectSession, fetchSessions } = useSessionList(sessionId)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const narrativeAccumRef = useRef<string>('')
  const lastPromptRef = useRef<string>('')
  const [validationStatus, setValidationStatus] = useState<'accepted' | 'modified' | 'rejected' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // On mount: restore the latest session's beats and pin its id so the user
  // continues that session without auto-streaming a new beat.
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    fetch('/api/session', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.ok ? r.json() : [])
      .then(async (sessions: Array<{ id: string }>) => {
        if (!sessions.length) return
        const latest = sessions[0]
        const res = await fetch('/api/session/' + latest.id + '/history', {
          headers: { Authorization: 'Bearer ' + token },
        })
        if (!res.ok) return
        const data = await res.json()
        const history: Array<{ narrative: string; choices?: Array<{ label: string }> }> = data.history ?? []
        const restored: Beat[] = history.map((h) => ({ narrative: h.narrative, chosenAction: null }))
        resetBeats(restored)
        setSessionId(latest.id)
        const lastChoices = history.at(-1)?.choices ?? []
        if (lastChoices.length) dispatch({ type: 'choices', choices: lastChoices })
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onEvent = (event: { type: string; [key: string]: unknown }) => {
    if (event.type === 'session') {
      setSessionId(event.sessionId as string)
      fetchSessions()
    } else if (event.type === 'rejected') {
      setValidationStatus('rejected')
      setRejectionReason(event.reason as string ?? '')
    } else if (event.type === 'modified') {
      setValidationStatus('modified')
    } else if (event.type === 'start') {
      setValidationStatus('accepted')
    } else if (event.type === 'chunk') {
      narrativeAccumRef.current += (event.content as string) ?? ''
    } else if (event.type === 'done') {
      addBeat(narrativeAccumRef.current)
      narrativeAccumRef.current = ''
    }
    dispatch(event as Parameters<typeof dispatch>[0])
  }

  const { start, isStreaming } = useStream('/api/generate/stream', onEvent)

  // Pin all actions to the current session so beats accumulate in one session.
  // When sessionId is null (New Chat), the server creates a fresh session and
  // echoes it back via the 'session' event, which we pin for subsequent calls.
  const startInSession = (prompt: string) => {
    start(sessionId ? { prompt, sessionId } : { prompt })
  }

  const handleRestoreSession = async (id: string) => {
    const token = localStorage.getItem('accessToken') ?? ''
    const res = await fetch('/api/session/' + id + '/history', {
      headers: { Authorization: 'Bearer ' + token },
    })
    if (!res.ok) return
    const data = await res.json()
    const history: Array<{ narrative: string; choices?: Array<{ label: string }> }> = data.history ?? []
    const restored: Beat[] = history.map((h) => ({ narrative: h.narrative, chosenAction: null }))
    resetBeats(restored)
    setSessionId(id)
    setSidebarOpen(false)
    setValidationStatus(null)
    setRejectionReason('')
    dispatch({ type: 'reset' })
    const lastChoices = history.at(-1)?.choices ?? []
    if (lastChoices.length) dispatch({ type: 'choices', choices: lastChoices })
  }

  const handleNewChat = () => {
    resetBeats([])
    setSessionId(null)
    setSidebarOpen(false)
    setValidationStatus(null)
    setRejectionReason('')
    narrativeAccumRef.current = ''
    dispatch({ type: 'reset' })
  }

  const handleRetry = () => {
    setValidationStatus(null)
    startInSession(lastPromptRef.current)
  }

  const handleChoice = (label: string) => {
    setChosenAction(beats.length - 1, label)
    setValidationStatus(null)
    dispatch({ type: 'start' })
    startInSession(label)
  }

  // No pre-flight POST — validation happens inside the stream.
  // The stream emits 'rejected' or 'modified' events which onEvent handles.
  const handleSubmit = (text: string) => {
    lastPromptRef.current = text
    setValidationStatus(null)
    setRejectionReason('')
    setChosenAction(beats.length - 1, text)
    dispatch({ type: 'start' })
    startInSession(text)
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <SessionSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        loading={sessionsLoading}
        selectedId={selectedId}
        currentSessionId={sessionId}
        onSelect={selectSession}
        onRestore={handleRestoreSession}
        onNewChat={handleNewChat}
        selectedBeats={selectedBeats}
        historyLoading={historyLoading}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <div data-testid="narrative-panel" className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-8">
          <div className="mx-auto w-full max-w-2xl space-y-6">
            <div className="flex items-center gap-2">
              <button
                aria-label="Toggle session sidebar"
                onClick={() => setSidebarOpen(o => !o)}
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
            <BeatHistory beats={beats} />
            {status === 'streaming' && <StreamingText text={narrativeText} isStreaming={isStreaming} />}
            {choices.length > 0 && status !== 'streaming' && (
              <ChoiceList choices={choices} onSelect={handleChoice} disabled={isStreaming} />
            )}
            {status === 'error' && (
              <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30 p-4 space-y-2">
                <p className="text-red-600 dark:text-red-400 text-sm">{errorMessage}</p>
                <RetryButton onRetry={handleRetry} />
              </div>
            )}
          </div>
        </div>
        <div data-testid="input-area" className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-4 sm:px-6 py-4">
          <div className="mx-auto w-full max-w-2xl space-y-2">
            <ValidationFeedback status={validationStatus} reason={rejectionReason} />
            <ActionInput onSubmit={handleSubmit} disabled={isStreaming} isValidating={false} />
          </div>
        </div>
      </div>
    </div>
  )
}
