export function NarrativePanel({ beats }: { beats: string[] }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
      {beats.map((beat, i) => (
        <p key={i} className="mb-4">{beat}</p>
      ))}
    </div>
  )
}
