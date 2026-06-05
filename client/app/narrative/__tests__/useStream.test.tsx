import { renderHook, act } from '@testing-library/react'
import { useStream } from '../hooks/useStream'

beforeEach(() => {
  global.fetch = jest.fn().mockImplementation(() => new Promise(() => {})) // never resolves
})

describe('useStream — isStreaming', () => {
  it('isStreaming is false initially', () => {
    const { result } = renderHook(() => useStream('http://test', jest.fn()))
    expect(result.current.isStreaming).toBe(false)
  })

  it('isStreaming becomes true after start() is called', () => {
    const { result } = renderHook(() => useStream('http://test', jest.fn()))
    act(() => { result.current.start({}) })
    expect(result.current.isStreaming).toBe(true)
  })
})

function makeStream(...lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line + '\n'))
      }
      controller.close()
    },
  })
}

describe('useStream — event dispatch', () => {
  it('calls onEvent for each parsed event and resets isStreaming when stream completes', async () => {
    const onEvent = jest.fn()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: makeStream(
        '{"type":"start"}',
        '{"type":"chunk","content":"Hello"}',
        '{"type":"done"}',
      ),
    })

    const { result } = renderHook(() => useStream('http://test', onEvent))

    await act(async () => {
      await result.current.start({})
    })

    expect(onEvent).toHaveBeenCalledWith({ type: 'start' })
    expect(onEvent).toHaveBeenCalledWith({ type: 'chunk', content: 'Hello' })
    expect(onEvent).toHaveBeenCalledWith({ type: 'done' })
    expect(result.current.isStreaming).toBe(false)
  })
})

describe('useStream — fetch error', () => {
  it('calls onEvent with error event and resets isStreaming when fetch rejects', async () => {
    const onEvent = jest.fn()
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'))

    const { result } = renderHook(() => useStream('http://test', onEvent))

    await act(async () => {
      await result.current.start({})
    })

    expect(onEvent).toHaveBeenCalledWith({ type: 'error', message: 'Network failure' })
    expect(result.current.isStreaming).toBe(false)
  })
})

describe('useStream — abort on unmount', () => {
  it('aborts the in-flight fetch when unmounted', () => {
    let capturedSignal: AbortSignal | null | undefined

    global.fetch = jest.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      capturedSignal = opts?.signal
      return new Promise(() => {}) // never resolves
    })

    const { result, unmount } = renderHook(() => useStream('http://test', jest.fn()))

    act(() => { result.current.start({}) })
    expect(capturedSignal).toBeDefined()
    expect(capturedSignal!.aborted).toBe(false)

    unmount()

    expect(capturedSignal!.aborted).toBe(true)
  })
})
