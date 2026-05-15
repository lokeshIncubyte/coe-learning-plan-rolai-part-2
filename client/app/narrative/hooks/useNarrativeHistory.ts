import { useState } from 'react'

export type Beat = { narrative: string; chosenAction: string | null }

export function useNarrativeHistory() {
  const [beats, setBeats] = useState<Beat[]>([])

  const addBeat = (narrative: string) =>
    setBeats((prev) => [...prev, { narrative, chosenAction: null }])

  const setChosenAction = (index: number, action: string) =>
    setBeats((prev) =>
      prev.map((beat, i) => (i === index ? { ...beat, chosenAction: action } : beat))
    )

  return { beats, addBeat, setChosenAction }
}
