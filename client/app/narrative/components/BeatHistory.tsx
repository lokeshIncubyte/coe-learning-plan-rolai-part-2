export type Beat = { narrative: string; chosenAction: string | null }

export function BeatHistory({ beats }: { beats: Beat[] }) {
  return (
    <div className="space-y-6">
      {beats.map((beat, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">{beat.narrative}</p>
          {beat.chosenAction && (
            <p data-testid="chosen-action" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
              {beat.chosenAction}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
