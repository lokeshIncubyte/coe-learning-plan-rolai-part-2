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

const narrativeHistoryState = {
  beats: [] as { narrative: string; chosenAction: string | null }[],
  addBeat: jest.fn(),
  setChosenAction: jest.fn(),
}

jest.mock('../hooks/useNarrativeHistory', () => ({
  useNarrativeHistory: () => narrativeHistoryState,
}))

// Default fetch mock: non-ok response → skip validation, proceed to stream
global.fetch = jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock

describe('NarrativePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsStreaming = false
    capturedOnEvent = null
    global.fetch = jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock
    narrativeHistoryState.beats = []
    narrativeHistoryState.addBeat.mockClear()
    narrativeHistoryState.setChosenAction.mockClear()
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

  it('disables the text input while isStreaming is true', () => {
    mockIsStreaming = true
    render(<NarrativePage />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('clears choices immediately when a choice is clicked', async () => {
    const user = userEvent.setup()
    render(<NarrativePage />)

    // Inject choices
    act(() => {
      capturedOnEvent!({ type: 'choices', choices: [{ label: 'Option A' }, { label: 'Option B' }] })
    })
    expect(screen.getByRole('button', { name: 'Option A' })).toBeInTheDocument()

    // Click a choice
    await user.click(screen.getByRole('button', { name: 'Option A' }))

    // Choices must be gone immediately
    expect(screen.queryByRole('button', { name: 'Option A' })).not.toBeInTheDocument()
  })

  it('calls addBeat with the accumulated narrative text when done fires', () => {
    render(<NarrativePage />)

    act(() => { capturedOnEvent!({ type: 'start' }) })
    act(() => { capturedOnEvent!({ type: 'chunk', content: 'Round one text.' }) })
    act(() => { capturedOnEvent!({ type: 'done' }) })

    expect(narrativeHistoryState.addBeat).toHaveBeenCalledWith('Round one text.')
  })

  it('does not call start when the validation endpoint rejects the prompt', async () => {
    const user = userEvent.setup()

    // Override fetch to return a rejection
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ rejected: true, reason: 'Not allowed' }),
    })

    render(<NarrativePage />)
    await user.type(screen.getByRole('textbox'), 'bad input')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      expect(mockStart).not.toHaveBeenCalled()
    })
  })

  it('records the chosen action on the current beat when a choice is clicked', async () => {
    const user = userEvent.setup()
    // Seed one beat so setChosenAction has a valid index to target
    narrativeHistoryState.beats = [{ narrative: 'You stand at a crossroads.', chosenAction: null }]
    render(<NarrativePage />)

    act(() => {
      capturedOnEvent!({ type: 'choices', choices: [{ label: 'Go north' }, { label: 'Go south' }] })
    })

    await user.click(screen.getByRole('button', { name: 'Go north' }))

    expect(narrativeHistoryState.setChosenAction).toHaveBeenCalledWith(0, 'Go north')
  })

  it('shows accepted feedback indicator after a non-rejected validation response', async () => {
    const user = userEvent.setup()

    // Override fetch to return an accepted (non-rejected) response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ narrative: 'ok', choices: [] }),
    })

    render(<NarrativePage />)
    await user.type(screen.getByRole('textbox'), 'go north')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => {
      expect(screen.getByTestId('feedback-indicator')).toHaveAttribute('data-status', 'accepted')
    })
  })
})
