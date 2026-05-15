import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import NarrativePage from '../page'

// --- Module-level mock state (shared across all page tests) ---
let capturedOnEvent: ((event: { type: string; [key: string]: unknown }) => void) | null = null
const mockStart = jest.fn()
let mockIsStreaming = false

jest.mock('../hooks/useStream', () => ({
  useStream: (_url: string, onEvent: (event: { type: string; [key: string]: unknown }) => void) => {
    capturedOnEvent = onEvent
    return { start: mockStart, isStreaming: mockIsStreaming }
  },
}))

jest.mock('../hooks/useScrollToBottom', () => ({
  useScrollToBottom: () => ({ current: null }),
}))

// Default fetch mock: non-ok response → skip validation, proceed to stream
global.fetch = jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock

describe('NarrativePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsStreaming = false
    capturedOnEvent = null
    global.fetch = jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock
  })

  it('renders an ActionInput (text input) on initial mount', () => {
    render(<NarrativePage />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})
