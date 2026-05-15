const statusStyles: Record<string, string> = {
  accepted: 'text-green-600',
  modified: 'text-orange-500',
  rejected: 'text-red-600',
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
    <div data-testid="feedback-indicator" data-status={status} className={`${statusStyles[status]} min-h-[1rem]`}>
      {reason}
    </div>
  )
}
