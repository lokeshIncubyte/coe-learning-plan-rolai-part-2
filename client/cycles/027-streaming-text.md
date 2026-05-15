---
id: cycle-027
slug: streaming-text
status: pending
exec: use /exec-cycle to execute this cycle
source: "StreamingText component — accepts text: string and isStreaming: boolean props; renders the text with a blinking cursor appended when isStreaming is true"
covers: happy-path
---

## Behavior
`StreamingText` renders its `text` prop. When `isStreaming` is `true`, a cursor element (identified by `data-testid="cursor"`) is rendered alongside the text. When `isStreaming` is `false`, no cursor element is rendered.

## RED
- **Test file**: `app/narrative/__tests__/StreamingText.test.tsx`
- **Assertion**:
  ```tsx
  import { render, screen } from '@testing-library/react'
  import { StreamingText } from '../components/StreamingText'

  describe('StreamingText', () => {
    it('renders the text', () => {
      render(<StreamingText text="Hello world" isStreaming={false} />)
      expect(screen.getByText(/Hello world/)).toBeInTheDocument()
    })

    it('shows cursor when isStreaming is true', () => {
      render(<StreamingText text="Hello" isStreaming={true} />)
      expect(screen.getByTestId('cursor')).toBeInTheDocument()
    })

    it('hides cursor when isStreaming is false', () => {
      render(<StreamingText text="Hello" isStreaming={false} />)
      expect(screen.queryByTestId('cursor')).not.toBeInTheDocument()
    })
  })
  ```
- **Why it fails**: `app/narrative/components/StreamingText.tsx` does not exist — the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `app/narrative/components/StreamingText.tsx`:
  ```tsx
  export function StreamingText({ text, isStreaming }: { text: string; isStreaming: boolean }) {
    return (
      <span>
        {text}
        {isStreaming && <span data-testid="cursor" className="inline-block animate-pulse">▊</span>}
      </span>
    )
  }
  ```
- **Files touched**: `app/narrative/components/StreamingText.tsx`

## REFACTOR
none
