import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChoiceList } from '../components/ChoiceList'

describe('ChoiceList', () => {
  it('renders a button for each choice', () => {
    render(<ChoiceList choices={[{ label: 'Fight' }, { label: 'Flee' }]} onSelect={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'Fight' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Flee' })).toBeInTheDocument()
  })

  it('renders nothing when choices is empty', () => {
    const { container } = render(<ChoiceList choices={[]} onSelect={jest.fn()} />)
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })

  it('replaces buttons when choices prop changes', () => {
    const { rerender } = render(
      <ChoiceList choices={[{ label: 'Fight' }]} onSelect={jest.fn()} />
    )
    expect(screen.getByRole('button', { name: 'Fight' })).toBeInTheDocument()

    rerender(<ChoiceList choices={[{ label: 'Negotiate' }]} onSelect={jest.fn()} />)
    expect(screen.queryByRole('button', { name: 'Fight' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Negotiate' })).toBeInTheDocument()
  })

  it('calls onSelect with the label when a button is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(<ChoiceList choices={[{ label: 'Negotiate' }, { label: 'Flee' }]} onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: 'Negotiate' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('Negotiate')
  })

  it('calls onSelect with the correct label for each button', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(<ChoiceList choices={[{ label: 'Fight' }, { label: 'Flee' }]} onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: 'Flee' }))

    expect(onSelect).toHaveBeenCalledWith('Flee')
  })
})
