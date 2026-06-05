import { useState } from 'react'

export type Beat = { narrative: string; chosenAction: string | null }

export function useNarrativeHistory(initialBeats: Beat[] = []) {
  const [beats, setBeats] = useState<Beat[]>(initialBeats)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const addBeat = (narrative: string) =>
    setBeats((prev) => [...prev, { narrative, chosenAction: null }])

  const setChosenAction = (index: number, action: string) =>
    setBeats((prev) =>
      prev.map((beat, i) => (i === index ? { ...beat, chosenAction: action } : beat))
    )

  const resetBeats = (newBeats: Beat[]) => setBeats(newBeats)

  return { beats, addBeat, setChosenAction, resetBeats, sessionId, setSessionId }
}
