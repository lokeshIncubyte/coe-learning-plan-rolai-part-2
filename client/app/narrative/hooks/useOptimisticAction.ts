import { useState } from 'react'

type Status = 'accepted' | 'modified' | 'rejected'

export function useOptimisticAction() {
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const addAction = (text: string) => setPendingAction(text)
  const confirmAction = (_status: Status) => setPendingAction(null)

  return { pendingAction, addAction, confirmAction }
}
