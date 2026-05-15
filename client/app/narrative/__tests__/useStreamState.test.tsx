import { renderHook, act } from '@testing-library/react'
import { useStreamState } from '../hooks/useStreamState'

describe('useStreamState — start', () => {
  it('starts with idle status and empty fields', () => {
    const { result } = renderHook(() => useStreamState())
    expect(result.current.status).toBe('idle')
    expect(result.current.narrativeText).toBe('')
    expect(result.current.choices).toEqual([])
    expect(result.current.errorMessage).toBe('')
  })

  it('transitions to streaming and clears state on start event', () => {
    const { result } = renderHook(() => useStreamState())
    act(() => { result.current.dispatch({ type: 'start' }) })
    expect(result.current.status).toBe('streaming')
    expect(result.current.narrativeText).toBe('')
    expect(result.current.choices).toEqual([])
    expect(result.current.errorMessage).toBe('')
  })
})

describe('useStreamState — chunk', () => {
  it('appends content to narrativeText on chunk event', () => {
    const { result } = renderHook(() => useStreamState())
    act(() => { result.current.dispatch({ type: 'chunk', content: 'Hello' }) })
    act(() => { result.current.dispatch({ type: 'chunk', content: ' World' }) })
    expect(result.current.narrativeText).toBe('Hello World')
  })
})
