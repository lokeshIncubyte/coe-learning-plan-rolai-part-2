---
id: cycle-043
slug: use-stream-state-start
status: done
exec: use /exec-cycle to execute this cycle
source: "useStreamState hook — start event transitions to status='streaming' and clears narrativeText, choices, errorMessage"
covers: happy-path
group: use-stream-state
---

## Behavior
`useStreamState` is a hook exported from `app/narrative/hooks/useStreamState.ts`. It exposes `{ status, narrativeText, choices, errorMessage, dispatch }`. Initial state: `status='idle'`, `narrativeText=''`, `choices=[]`, `errorMessage=''`. Calling `dispatch({ type: 'start' })` sets `status='streaming'` and clears all other fields. This cycle's GREEN only handles the `start` case — all other dispatch types are no-ops (return state unchanged).

## RED
- **Test file**: `app/narrative/__tests__/useStreamState.test.tsx`
- **Assertion**:
  ```tsx
  import { renderHook, act } from '@testing-library/react'
  import { useStreamState } from '../hooks/useStreamState'

  describe('useStreamState — start', () => {
    it('starts with idle status and empty fields', () => {
      const { result } = renderHook(() => useStreamState())
      expect(result.current.status).toBe('idle')
      expect(result.current.narrativeText).toBe('')
      expect(result.current.choices).toEqual([])
      expect(result.current.errorMessage).toBe('')
    })

    it('transitions to streaming and clears state on start event', () => {
      const { result } = renderHook(() => useStreamState())
      act(() => { result.current.dispatch({ type: 'start' }) })
      expect(result.current.status).toBe('streaming')
      expect(result.current.narrativeText).toBe('')
      expect(result.current.choices).toEqual([])
      expect(result.current.errorMessage).toBe('')
    })
  })
  ```
- **Why it fails**: `app/narrative/hooks/useStreamState.ts` does not exist — the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `app/narrative/hooks/useStreamState.ts` using `useReducer`. Only handle the `start` case; all other actions return state unchanged:
  ```ts
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
      default:
        return state
    }
  }

  export function useStreamState() {
    const [state, dispatch] = useReducer(reducer, initialState)
    return { ...state, dispatch }
  }
  ```
- **Files touched**: `app/narrative/hooks/useStreamState.ts`

## REFACTOR
none

---

> **Execute:** Run `/exec-cycle` to execute this cycle (RED → GREEN → squash merge).
