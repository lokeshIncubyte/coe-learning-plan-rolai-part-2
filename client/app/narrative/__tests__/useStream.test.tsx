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
