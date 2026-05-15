import { render, screen } from '@testing-library/react'
import { ValidationFeedback } from '../components/ValidationFeedback'

describe('ValidationFeedback', () => {
  it('renders nothing when status is null', () => {
    const { container } = render(<ValidationFeedback status={null} reason="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the reason text when status is accepted', () => {
    render(<ValidationFeedback status="accepted" reason="Good move." />)
    expect(screen.getByText('Good move.')).toBeInTheDocument()
    expect(screen.getByTestId('feedback-indicator')).toHaveAttribute('data-status', 'accepted')
  })

  it('renders the reason text when status is modified', () => {
    render(<ValidationFeedback status="modified" reason="Slightly changed." />)
    expect(screen.getByText('Slightly changed.')).toBeInTheDocument()
    expect(screen.getByTestId('feedback-indicator')).toHaveAttribute('data-status', 'modified')
  })

  it('renders the reason text when status is rejected', () => {
    render(<ValidationFeedback status="rejected" reason="Cannot phase through walls." />)
    expect(screen.getByText('Cannot phase through walls.')).toBeInTheDocument()
    expect(screen.getByTestId('feedback-indicator')).toHaveAttribute('data-status', 'rejected')
  })
})
