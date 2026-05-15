'use client'

import { useRef, useState } from 'react'
import { useStreamState } from './hooks/useStreamState'
import { useStream } from './hooks/useStream'
import { useNarrativeHistory } from './hooks/useNarrativeHistory'
import { ActionInput } from './components/ActionInput'
import { StreamingText } from './components/StreamingText'
import { ChoiceList } from './components/ChoiceList'
import { BeatHistory } from './components/BeatHistory'
import { ValidationFeedback } from './components/ValidationFeedback'
import { RetryButton } from './components/RetryButton'

export default function NarrativePage() {
  const { status, narrativeText, choices, errorMessage, dispatch } = useStreamState()
  const { beats, addBeat, setChosenAction } = useNarrativeHistory()
  const narrativeAccumRef = useRef<string>('')
  const lastPromptRef = useRef<string>('')
  const [validationStatus, setValidationStatus] = useState<'accepted' | 'modified' | 'rejected' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const onEvent = (event: { type: string; [key: string]: unknown }) => {
    if (event.type === 'chunk') {
      narrativeAccumRef.current += (event.content as string) ?? ''
    } else if (event.type === 'done') {
      addBeat(narrativeAccumRef.current)
      narrativeAccumRef.current = ''
    }
    dispatch(event as Parameters<typeof dispatch>[0])
  }

  const { start, isStreaming } = useStream('/api/generate/stream', onEvent)

  const handleRetry = () => { start({ prompt: lastPromptRef.current }) }

  const handleChoice = (label: string) => {
    setChosenAction(beats.length - 1, label)
    dispatch({ type: 'start' })
    start({ prompt: label })
  }

  const handleSubmit = async (text: string) => {
    lastPromptRef.current = text
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.rejected) {
          setValidationStatus('rejected')
          setRejectionReason(data.reason ?? '')
          return
        }
        setValidationStatus('accepted')
      }
    } catch {
      // validation unavailable — proceed to stream
    }
    start({ prompt: text })
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div data-testid="narrative-panel" className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <BeatHistory beats={beats} />
          {status === 'streaming' && <StreamingText text={narrativeText} isStreaming={isStreaming} />}
          {choices.length > 0 && <ChoiceList choices={choices} onSelect={handleChoice} />}
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
          <ActionInput onSubmit={handleSubmit} disabled={isStreaming} />
        </div>
      </div>
    </div>
  )
}
