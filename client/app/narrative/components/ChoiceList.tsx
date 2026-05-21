export function ChoiceList({
  choices,
  onSelect,
  disabled = false,
}: {
  choices: { label: string }[]
  onSelect: (label: string) => void
  disabled?: boolean
}) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      {choices.map((choice) => (
        <button
          key={choice.label}
          onClick={() => !disabled && onSelect(choice.label)}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-indigo-500 dark:hover:bg-slate-800"
        >
          {choice.label}
        </button>
      ))}
    </div>
  )
}
