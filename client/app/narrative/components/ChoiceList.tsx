export function ChoiceList({
  choices,
  onSelect,
}: {
  choices: { label: string }[]
  onSelect: (label: string) => void
}) {
  return (
    <div>
      {choices.map((choice) => (
        <button key={choice.label} onClick={() => onSelect(choice.label)}>
          {choice.label}
        </button>
      ))}
    </div>
  )
}
