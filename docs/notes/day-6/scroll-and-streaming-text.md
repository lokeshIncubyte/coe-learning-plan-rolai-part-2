# Scroll-to-Bottom and Streaming Text Rendering

## Auto-Scroll with `useRef` + `scrollIntoView`

**Anchor element pattern** — place an empty div at the bottom of the list:

```tsx
const bottomRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' })
}, [messages])

// Last child of message container:
<div ref={bottomRef} />
```

**`block: 'end'`** aligns the bottom of the element to the viewport — correct for an anchor div at the end of a list. `true` aligns the top; `false` / `block: 'end'` aligns the bottom.

**`behavior: 'smooth'` during fast streaming causes scroll lag** — the smooth animation can't keep up with rapid content growth. Use `'instant'` for streaming; reserve `'smooth'` for user-triggered actions.

---

## Only Scroll When User Is Near Bottom

The canonical formula:
```ts
function isNearBottom(el: HTMLElement, threshold = 100): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
}
```

Threshold of **2px** handles sub-pixel rendering; **100px** is more lenient and recommended for chat UX.

**Full wiring:**
```tsx
const containerRef = useRef<HTMLDivElement>(null)
const [isNearBottom, setIsNearBottom] = useState(true)

const handleScroll = useCallback(() => {
  const el = containerRef.current
  if (!el) return
  setIsNearBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 100)
}, [])

// Attach:
<div ref={containerRef} onScroll={handleScroll}>

// Scroll only if near bottom:
useEffect(() => {
  if (!isNearBottom) return
  requestAnimationFrame(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight })
  })
}, [messages, isNearBottom])
```

`requestAnimationFrame` ensures scroll fires **after** the browser has painted the new content — without it, `scrollHeight` may not yet reflect new nodes.

**Include `isNearBottom` in the dependency array** so that if the user scrolls back down mid-stream, auto-scroll resumes immediately.

**Alternative — Intersection Observer** (avoids scroll events):
```tsx
const anchorRef = useRef<HTMLDivElement>(null)
const [anchorVisible, setAnchorVisible] = useState(true)

useEffect(() => {
  const obs = new IntersectionObserver(([e]) => setAnchorVisible(e.isIntersecting))
  if (anchorRef.current) obs.observe(anchorRef.current)
  return () => obs.disconnect()
}, [])
// When anchorVisible is false: user scrolled up → show "Jump to bottom" button
```

**Library option:** `use-stick-to-bottom` (stackblitz-labs) uses velocity-based spring animations and `ResizeObserver` — distinguishes user scrolling from programmatic without debouncing.

---

## CSS Layout — Scroll Container

```css
/* Outer shell: fixed height, flex column */
.chat-shell {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

/* Message list: grows, scrolls */
.message-list {
  flex: 1;
  min-height: 0;   /* CRITICAL — without this, flex child won't shrink and overflow-y breaks */
  overflow-y: auto;
}

/* Input bar: fixed at bottom */
.input-bar {
  flex-shrink: 0;
}
```

**`min-height: 0` is the most common gotcha.** Flex children have `min-height: auto` by default — this prevents the container from shrinking, breaking `overflow-y: auto`. Without it, the container expands to fit all content and never scrolls.

**`overflow-y: auto` vs `scroll`:** `auto` shows scrollbar only when needed; `scroll` always reserves scrollbar space (prevents layout shift on first overflow). For streaming content, `scroll` avoids jitter.

---

## `useEffect` Dependencies for Scroll

**Discrete messages:** `[messages.length]` — fires once per message added.

**Streaming content:** `[messages]` — reference equality changes each state flush. Avoid using the accumulated string directly as a dependency at per-character frequency; batch state updates (see below) so the effect runs at flush intervals (~50ms), not per token.

**`useLayoutEffect` vs `useEffect` for scroll:** `useLayoutEffect` runs synchronously after DOM mutation but before paint — use it if you see a flash of un-scrolled content. `useEffect` (after paint) is fine for most cases.

---

## Streaming Text Rendering — Avoid Full Re-Renders

**Naive approach (avoid):**
```tsx
// Each token triggers full component tree re-render
setMessages(prev => [...prev, newToken])
```

**Correct — accumulate in the message's `content` field, not the array:**
```tsx
setMessages(prev => {
  const updated = [...prev]
  updated[updated.length - 1] = {
    ...updated[updated.length - 1],
    content: updated[updated.length - 1].content + chunk,
  }
  return updated
})
```

**Memoize the list** so only the active (last) message re-renders:
```tsx
const MessageList = memo(function MessageList({ messages }) {
  return messages.map(m => <MessageBubble key={m.id} message={m} />)
})

const MessageBubble = memo(function MessageBubble({ message }) {
  // Only re-renders when its own message prop changes
})
```

**Defer expensive rendering during stream.** Skip markdown parsing while streaming:
```tsx
const content = useMemo(() => {
  if (isStreaming) return <span>{rawText}</span>
  return <ReactMarkdown>{rawText}</ReactMarkdown>
}, [rawText, isStreaming])
```

---

## `useRef` vs `useState` for Accumulated Text

**Rule:** `useRef` = zero re-renders; `useState` = re-render on every set.

**Pattern: buffer with `useRef`, flush with `useState` at controlled intervals:**
```tsx
const bufferRef = useRef<string>('')
const [displayedText, setDisplayedText] = useState('')

// On each SSE/stream chunk — no setState, no re-render:
function onChunk(chunk: string) {
  bufferRef.current += chunk
}

// Flush 20x/second (50ms) — feels real-time, avoids render overload:
useEffect(() => {
  const id = setInterval(() => {
    if (bufferRef.current.length > 0) {
      setDisplayedText(prev => prev + bufferRef.current)
      bufferRef.current = ''
    }
  }, 50)
  return () => clearInterval(id)
}, [])
```

**`requestAnimationFrame` alternative** (ties to ~60fps, ~16ms):
```tsx
const flush = () => {
  if (bufferRef.current.length > 0) {
    setDisplayedText(prev => prev + bufferRef.current)
    bufferRef.current = ''
  }
  rafId = requestAnimationFrame(flush)
}
```

**Interval tuning:**
- < 30ms: too many renders, wasteful
- 30–50ms: optimal — smooth, imperceptible lag
- > 100ms: visibly choppy

**When to use `useRef` exclusively:** values that drive side-effects but not rendering — `AbortController`, scroll position, timer IDs, previous value comparisons. Never for content you need to display.

---

## Typing Indicator

**State machine:**
```ts
type StreamState = 'idle' | 'waiting' | 'streaming' | 'done'
// 'waiting'   → first token not yet received → show bouncing dots
// 'streaming' → tokens arriving              → show inline blinking cursor
// 'done'      → stream closed               → hide both, render final markdown
```

**Inline blinking cursor (ChatGPT-style):**
```css
@keyframes flicker {
  0%, 100% { opacity: 0; }
  50%       { opacity: 1; }
}
.cursor {
  display: inline-block;
  width: 1ch;
  animation: flicker 0.5s infinite;
}
```

```tsx
<span>
  {displayedText}
  {isStreaming && <span className="cursor">▊</span>}
</span>
```

**Three-dot bouncing indicator** (while waiting for first token):
```css
@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30%           { transform: translateY(-6px); }
}
.dot { animation: bounce 1.2s infinite; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
```

**Always remove the cursor after stream ends** — set `isStreaming = false` in the stream's `finally` block or on `[DONE]` event.

---

## Key Gotchas

| Gotcha | Fix |
|---|---|
| `min-height: 0` missing | Flex scroll container won't shrink — add it |
| `behavior: 'smooth'` during streaming | Use `'instant'`; smooth for user-triggered only |
| `scrollHeight` read synchronously | Read inside `requestAnimationFrame` or `useLayoutEffect` |
| Long conversations (1000+ messages) | Virtualize with `@tanstack/react-virtual` or `react-window` |
| `scrollHeight` after new content | `ResizeObserver` (use-stick-to-bottom) is more reliable than scroll events |
| Cursor left visible after stream ends | Set `isStreaming = false` in `finally` block |
