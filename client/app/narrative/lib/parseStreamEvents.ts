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
