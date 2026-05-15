import { render, screen } from '@testing-library/react'
import { StreamingText } from '../components/StreamingText'

describe('StreamingText', () => {
  it('renders the text', () => {
    render(<StreamingText text="Hello world" isStreaming={false} />)
    expect(screen.getByText(/Hello world/)).toBeInTheDocument()
  })

  it('shows cursor when isStreaming is true', () => {
    render(<StreamingText text="Hello" isStreaming={true} />)
    expect(screen.getByTestId('cursor')).toBeInTheDocument()
  })

  it('hides cursor when isStreaming is false', () => {
    render(<StreamingText text="Hello" isStreaming={false} />)
    expect(screen.queryByTestId('cursor')).not.toBeInTheDocument()
  })
})
