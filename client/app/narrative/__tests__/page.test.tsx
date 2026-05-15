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

  it('calls start({ prompt }) when the user submits text', async () => {
    const user = userEvent.setup()
    render(<NarrativePage />)
    await user.type(screen.getByRole('textbox'), 'hello')
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    expect(mockStart).toHaveBeenCalledWith({ prompt: 'hello' })
  })

  it('displays chunk content in the narrative panel during streaming', () => {
    render(<NarrativePage />)
    act(() => { capturedOnEvent!({ type: 'start' }) })
    act(() => { capturedOnEvent!({ type: 'chunk', content: 'hello world' }) })
    expect(screen.getByTestId('narrative-panel')).toHaveTextContent('hello world')
  })

  it('shows choice buttons after a choices event arrives', () => {
    render(<NarrativePage />)
    act(() => { capturedOnEvent!({ type: 'choices', choices: [{ label: 'Fight' }, { label: 'Flee' }] }) })
    expect(screen.getByRole('button', { name: 'Fight' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Flee' })).toBeInTheDocument()
  })

  it('hides the streaming cursor after the done event', () => {
    mockIsStreaming = true
    render(<NarrativePage />)
    act(() => { capturedOnEvent!({ type: 'start' }) })
    expect(screen.getByTestId('cursor')).toBeInTheDocument()
    act(() => { capturedOnEvent!({ type: 'done' }) })
    expect(screen.queryByTestId('cursor')).not.toBeInTheDocument()
  })
})
