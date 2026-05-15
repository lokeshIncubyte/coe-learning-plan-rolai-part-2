import { render, screen } from '@testing-library/react'
import NarrativePage from '../page'

describe('NarrativePage', () => {
  it('renders narrative panel and input area', () => {
    render(<NarrativePage />)
    expect(screen.getByTestId('narrative-panel')).toBeInTheDocument()
    expect(screen.getByTestId('input-area')).toBeInTheDocument()
  })
})
