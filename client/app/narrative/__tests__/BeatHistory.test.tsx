import { render, screen } from '@testing-library/react'
import { BeatHistory } from '../components/BeatHistory'

describe('BeatHistory', () => {
  it('renders each beat narrative', () => {
    render(
      <BeatHistory
        beats={[
          { narrative: 'The hero entered the cave.', chosenAction: null },
          { narrative: 'A dragon appeared.', chosenAction: null },
        ]}
      />
    )
    expect(screen.getByText('The hero entered the cave.')).toBeInTheDocument()
    expect(screen.getByText('A dragon appeared.')).toBeInTheDocument()
  })

  it('renders chosen-action element when chosenAction is set', () => {
    render(
      <BeatHistory
        beats={[{ narrative: 'The hero entered.', chosenAction: 'Attack the dragon' }]}
      />
    )
    expect(screen.getByTestId('chosen-action')).toHaveTextContent('Attack the dragon')
  })

  it('does not render chosen-action element when chosenAction is null', () => {
    render(
      <BeatHistory
        beats={[{ narrative: 'The hero entered.', chosenAction: null }]}
      />
    )
    expect(screen.queryByTestId('chosen-action')).not.toBeInTheDocument()
  })

  it('renders chosen-action only for beats that have one', () => {
    render(
      <BeatHistory
        beats={[
          { narrative: 'Beat one.', chosenAction: 'Flee' },
          { narrative: 'Beat two.', chosenAction: null },
        ]}
      />
    )
    expect(screen.getAllByTestId('chosen-action')).toHaveLength(1)
    expect(screen.getByTestId('chosen-action')).toHaveTextContent('Flee')
  })
})
