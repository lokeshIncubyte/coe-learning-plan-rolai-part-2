import { renderHook } from '@testing-library/react'
import { useScrollToBottom } from '../hooks/useScrollToBottom'

function makeContainer(scrollTop: number, scrollHeight: number, clientHeight: number) {
  return {
    scrollTop,
    scrollHeight,
    clientHeight,
    scrollTo: jest.fn(),
  }
}

describe('useScrollToBottom', () => {
  it('scrolls to bottom when container is near bottom', () => {
    const container = makeContainer(900, 1000, 95)
    const { result, rerender } = renderHook(({ dep }) => useScrollToBottom(dep), {
      initialProps: { dep: 0 },
    })
    result.current.current = container as unknown as HTMLElement
    rerender({ dep: 1 })
    expect(container.scrollTo).toHaveBeenCalledWith({ top: 1000 })
  })

  it('does not scroll when container is far from bottom', () => {
    const container = makeContainer(0, 1000, 200)
    const { result, rerender } = renderHook(({ dep }) => useScrollToBottom(dep), {
      initialProps: { dep: 0 },
    })
    result.current.current = container as unknown as HTMLElement
    rerender({ dep: 1 })
    expect(container.scrollTo).not.toHaveBeenCalled()
  })
})
