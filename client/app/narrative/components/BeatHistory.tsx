export type Beat = { narrative: string; chosenAction: string | null }

export function BeatHistory({ beats }: { beats: Beat[] }) {
  return (
    <div>
      {beats.map((beat, i) => (
        <div key={i}>
          <p>{beat.narrative}</p>
          {beat.chosenAction && (
            <p data-testid="chosen-action" className="font-semibold text-indigo-600">
              {beat.chosenAction}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
