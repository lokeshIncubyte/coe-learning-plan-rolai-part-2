export type StreamEvent =
  | { type: 'session'; sessionId: string }
  | { type: string; [key: string]: unknown }

export function parseStreamEvents(chunk: string): StreamEvent[] {
  return chunk
    .split('\n')
    .filter((line) => line.trim() !== '')
    .flatMap((line) => {
      const jsonLine = line.startsWith('data: ') ? line.slice(6) : line
      try {
        return [JSON.parse(jsonLine) as StreamEvent]
      } catch {
        return []
      }
    })
}
