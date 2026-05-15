'use client'

import { ActionInput } from './components/ActionInput'

export default function NarrativePage() {
  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <div data-testid="narrative-panel" className="flex-1 min-h-0 overflow-y-auto" />
      <div data-testid="input-area" className="flex-shrink-0">
        <ActionInput onSubmit={() => {}} disabled={false} />
      </div>
    </div>
  )
}
