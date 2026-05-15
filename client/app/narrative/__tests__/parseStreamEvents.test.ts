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

  it('strips SSE data: prefix before parsing', () => {
    expect(parseStreamEvents('data: {"type":"start"}\n\ndata: {"type":"done"}')).toEqual([
      { type: 'start' },
      { type: 'done' },
    ])
  })
})
