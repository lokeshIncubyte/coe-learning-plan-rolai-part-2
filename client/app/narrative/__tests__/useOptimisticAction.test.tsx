import { act, renderHook } from '@testing-library/react'
import { useOptimisticAction } from '../hooks/useOptimisticAction'

describe('useOptimisticAction', () => {
  it('starts with null pendingAction', () => {
    const { result } = renderHook(() => useOptimisticAction())
    expect(result.current.pendingAction).toBeNull()
  })

  it('sets pendingAction when addAction is called', () => {
    const { result } = renderHook(() => useOptimisticAction())
    act(() => { result.current.addAction('attack the guard') })
    expect(result.current.pendingAction).toBe('attack the guard')
  })

  it('clears pendingAction when confirmAction is called with accepted', () => {
    const { result } = renderHook(() => useOptimisticAction())
    act(() => { result.current.addAction('flee') })
    act(() => { result.current.confirmAction('accepted') })
    expect(result.current.pendingAction).toBeNull()
  })

  it('clears pendingAction when confirmAction is called with modified', () => {
    const { result } = renderHook(() => useOptimisticAction())
    act(() => { result.current.addAction('flee') })
    act(() => { result.current.confirmAction('modified') })
    expect(result.current.pendingAction).toBeNull()
  })

  it('clears pendingAction when confirmAction is called with rejected', () => {
    const { result } = renderHook(() => useOptimisticAction())
    act(() => { result.current.addAction('phase through wall') })
    act(() => { result.current.confirmAction('rejected') })
    expect(result.current.pendingAction).toBeNull()
  })
})
