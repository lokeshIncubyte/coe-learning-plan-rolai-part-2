'use client'

import { useStreamState } from './hooks/useStreamState'
import { useStream } from './hooks/useStream'
import { ActionInput } from './components/ActionInput'
import { StreamingText } from './components/StreamingText'
import { ChoiceList } from './components/ChoiceList'

export default function NarrativePage() {
  const { status, narrativeText, choices, dispatch } = useStreamState()
  const handleChoice = (_label: string) => {}
  const { start, isStreaming } = useStream('/api/generate/stream', dispatch)

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
        {status === 'streaming' && <StreamingText text={narrativeText} isStreaming={isStreaming} />}
        {choices.length > 0 && <ChoiceList choices={choices} onSelect={handleChoice} />}
      </div>
      <div data-testid="input-area" className="flex-shrink-0">
        <ActionInput onSubmit={handleSubmit} disabled={isStreaming} />
      </div>
    </div>
  )
}
