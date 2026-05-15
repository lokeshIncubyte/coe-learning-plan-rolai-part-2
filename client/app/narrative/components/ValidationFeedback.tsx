const statusStyles: Record<string, string> = {
  accepted: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300',
  modified: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300',
  rejected: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300',
}

export function ValidationFeedback({
  status,
  reason,
}: {
  status: 'accepted' | 'modified' | 'rejected' | null
  reason: string
}) {
  if (!status) return null

  return (
    <div data-testid="feedback-indicator" data-status={status} className={`${statusStyles[status]} rounded-md border px-3 py-2 text-sm`}>
      {reason}
    </div>
  )
}
