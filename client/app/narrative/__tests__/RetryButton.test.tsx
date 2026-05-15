import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RetryButton } from '../components/RetryButton'

describe('RetryButton', () => {
  it('renders a button with text "Retry"', () => {
    render(<RetryButton onRetry={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('calls onRetry when the button is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = jest.fn()
    render(<RetryButton onRetry={onRetry} />)
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
