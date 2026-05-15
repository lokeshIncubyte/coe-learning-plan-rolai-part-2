export function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      onClick={onRetry}
      className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:border-red-800 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30"
    >
      Retry
    </button>
  )
}
