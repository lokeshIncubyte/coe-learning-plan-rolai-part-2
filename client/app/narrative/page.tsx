'use client'

import { useStreamState } from './hooks/useStreamState'
import { useStream } from './hooks/useStream'
import { useNarrativeHistory } from './hooks/useNarrativeHistory'
import { ActionInput } from './components/ActionInput'
import { StreamingText } from './components/StreamingText'
import { ChoiceList } from './components/ChoiceList'
import { BeatHistory } from './components/BeatHistory'

export default function NarrativePage() {
  const { status, narrativeText, choices, dispatch } = useStreamState()
  const { beats, addBeat, setChosenAction } = useNarrativeHistory()
  const { start, isStreaming } = useStream('/api/generate/stream', dispatch)

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
        if (data.rejected) return
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
      </div>
      <div data-testid="input-area" className="flex-shrink-0">
        <ActionInput onSubmit={handleSubmit} disabled={isStreaming} />
      </div>
    </div>
  )
}
