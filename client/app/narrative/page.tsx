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

  const handleRetry = () => {}

  const handleChoice = (label: string) => {
    setChosenAction(beats.length - 1, label)
    dispatch({ type: 'start' })
    start({ prompt: label })
  }

  const handleSubmit = async (text: string) => {
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
    <div className="flex flex-col h-dvh overflow-hidden">
      <div data-testid="narrative-panel" className="flex-1 min-h-0 overflow-y-auto">
        <BeatHistory beats={beats} />
        {status === 'streaming' && <StreamingText text={narrativeText} isStreaming={isStreaming} />}
        {choices.length > 0 && <ChoiceList choices={choices} onSelect={handleChoice} />}
        {status === 'error' && (
          <>
            <p>{errorMessage}</p>
            <RetryButton onRetry={handleRetry} />
          </>
        )}
      </div>
      <div data-testid="input-area" className="flex-shrink-0">
        <ValidationFeedback status={validationStatus} reason={rejectionReason} />
        <ActionInput onSubmit={handleSubmit} disabled={isStreaming} />
      </div>
    </div>
  )
}
