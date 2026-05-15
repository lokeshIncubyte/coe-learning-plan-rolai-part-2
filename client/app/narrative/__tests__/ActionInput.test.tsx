import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActionInput } from '../components/ActionInput'

describe('ActionInput', () => {
  it('renders a text input and submit button', () => {
    render(<ActionInput onSubmit={jest.fn()} disabled={false} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('calls onSubmit with trimmed value and clears field on button click', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<ActionInput onSubmit={onSubmit} disabled={false} />)

    await user.type(screen.getByRole('textbox'), '  attack the guard  ')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalledWith('attack the guard')
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('disables input and button when disabled is true', () => {
    render(<ActionInput onSubmit={jest.fn()} disabled={true} />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
  })

  it('does not call onSubmit when input is blank', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<ActionInput onSubmit={onSubmit} disabled={false} />)

    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).not.toHaveBeenCalled()
  })
})
