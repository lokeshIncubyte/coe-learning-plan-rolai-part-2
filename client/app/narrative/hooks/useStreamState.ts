import { useReducer } from 'react'
import type { StreamEvent } from '../lib/parseStreamEvents'

type Status = 'idle' | 'streaming' | 'done' | 'error'

type State = {
  status: Status
  narrativeText: string
  choices: { label: string }[]
  errorMessage: string
}

const initialState: State = {
  status: 'idle',
  narrativeText: '',
  choices: [],
  errorMessage: '',
}

function reducer(state: State, action: StreamEvent): State {
  switch (action.type) {
    case 'start':
      return { status: 'streaming', narrativeText: '', choices: [], errorMessage: '' }
    case 'chunk':
      return { ...state, narrativeText: state.narrativeText + (action.content as string) }
    case 'done':
      return { ...state, status: 'done' }
    default:
      return state
  }
}

export function useStreamState() {
  const [state, dispatch] = useReducer(reducer, initialState)
  return { ...state, dispatch }
}
