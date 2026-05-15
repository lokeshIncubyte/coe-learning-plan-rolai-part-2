import { render, screen } from '@testing-library/react'
import { NarrativePanel } from '../components/NarrativePanel'

describe('NarrativePanel', () => {
  it('renders each beat as a paragraph', () => {
    render(<NarrativePanel beats={['Once upon a time', 'The hero arose']} />)
    expect(screen.getByText('Once upon a time')).toBeInTheDocument()
    expect(screen.getByText('The hero arose')).toBeInTheDocument()
  })

  it('renders nothing inside container when beats is empty', () => {
    const { container } = render(<NarrativePanel beats={[]} />)
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })
})
