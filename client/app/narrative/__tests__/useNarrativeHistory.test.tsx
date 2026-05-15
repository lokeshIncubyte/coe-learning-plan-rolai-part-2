import { act, renderHook } from '@testing-library/react'
import { useNarrativeHistory } from '../hooks/useNarrativeHistory'

describe('useNarrativeHistory — addBeat', () => {
  it('starts with empty beats array', () => {
    const { result } = renderHook(() => useNarrativeHistory())
    expect(result.current.beats).toEqual([])
  })

  it('appends a beat with null chosenAction when addBeat is called', () => {
    const { result } = renderHook(() => useNarrativeHistory())
    act(() => { result.current.addBeat('The hero entered the cave.') })
    expect(result.current.beats).toEqual([
      { narrative: 'The hero entered the cave.', chosenAction: null },
    ])
  })

  it('accumulates multiple beats in order', () => {
    const { result } = renderHook(() => useNarrativeHistory())
    act(() => { result.current.addBeat('Beat one.') })
    act(() => { result.current.addBeat('Beat two.') })
    expect(result.current.beats).toEqual([
      { narrative: 'Beat one.', chosenAction: null },
      { narrative: 'Beat two.', chosenAction: null },
    ])
  })
})
