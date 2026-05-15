import { useState } from 'react'

export type Beat = { narrative: string; chosenAction: string | null }

export function useNarrativeHistory() {
  const [beats, setBeats] = useState<Beat[]>([])

  const addBeat = (narrative: string) =>
    setBeats((prev) => [...prev, { narrative, chosenAction: null }])

  return { beats, addBeat }
}
