---
id: cycle-038
slug: parse-stream-events
status: done
exec: use /exec-cycle to execute this cycle
source: "useStream SSE event parser utility — pure function parseStreamEvents(chunk: string): StreamEvent[]"
covers: happy-path
group: use-stream
---

## Behavior
`parseStreamEvents` is a pure function exported from `app/narrative/lib/parseStreamEvents.ts`. It accepts a raw chunk string (newline-delimited JSON), splits on newlines, skips blank lines and any line that is not valid JSON, and returns an array of parsed `StreamEvent` objects.

## RED
- **Test file**: `app/narrative/__tests__/parseStreamEvents.test.ts`
- **Assertion**:
  ```ts
  import { parseStreamEvents } from '../lib/parseStreamEvents'

  describe('parseStreamEvents', () => {
    it('parses a single valid JSON line', () => {
      expect(parseStreamEvents('{"type":"chunk","content":"hello"}')).toEqual([
        { type: 'chunk', content: 'hello' },
      ])
    })

    it('parses multiple newline-separated JSON lines', () => {
      expect(parseStreamEvents('{"type":"start"}\n{"type":"done"}')).toEqual([
        { type: 'start' },
        { type: 'done' },
      ])
    })

    it('skips blank lines', () => {
      expect(parseStreamEvents('{"type":"start"}\n\n{"type":"done"}')).toEqual([
        { type: 'start' },
        { type: 'done' },
      ])
    })

    it('skips invalid JSON lines silently', () => {
      expect(parseStreamEvents('{"type":"start"}\nnot-json\n{"type":"done"}')).toEqual([
        { type: 'start' },
        { type: 'done' },
      ])
    })

    it('returns an empty array for a blank string', () => {
      expect(parseStreamEvents('')).toEqual([])
      expect(parseStreamEvents('\n\n')).toEqual([])
    })
  })
  ```
- **Why it fails**: `app/narrative/lib/parseStreamEvents.ts` does not exist — the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `app/narrative/lib/parseStreamEvents.ts` (create the `lib/` directory too — it does not exist yet):
  ```ts
  export type StreamEvent = { type: string; [key: string]: unknown }

  export function parseStreamEvents(chunk: string): StreamEvent[] {
    return chunk
      .split('\n')
      .filter((line) => line.trim() !== '')
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as StreamEvent]
        } catch {
          return []
        }
      })
  }
  ```
- **Files touched**: `app/narrative/lib/parseStreamEvents.ts`

## REFACTOR
none

---

> **Execute:** Run `/exec-cycle` to execute this cycle (RED → GREEN → squash merge).
