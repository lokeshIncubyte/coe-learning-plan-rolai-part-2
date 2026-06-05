'use client'

import type { SessionMeta, SessionBeat } from '../hooks/useSessionList'

type Props = {
  open: boolean
  onClose: () => void
  sessions: SessionMeta[]
  loading: boolean
  selectedId: string | null
  currentSessionId: string | null
  onSelect: (id: string) => void
  onRestore: (id: string) => void
  selectedBeats: SessionBeat[]
  historyLoading: boolean
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const month = d.toLocaleString('default', { month: 'short' })
  return month + ' ' + d.getDate() + ', ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
}

export function SessionSidebar({
  open,
  onClose,
  sessions,
  loading,
  selectedId,
  currentSessionId,
  onSelect,
  onRestore,
  selectedBeats,
  historyLoading,
}: Props) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-10 bg-black/20 sm:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        data-testid="session-sidebar"
        className={[
          'flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800',
          'bg-white dark:bg-slate-900 transition-all duration-200 overflow-hidden',
          open ? 'w-64' : 'w-0',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sessions</span>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="px-4 py-3 text-xs text-slate-400">Loading…</p>
          )}
          {!loading && sessions.length === 0 && (
            <p className="px-4 py-3 text-xs text-slate-400">No sessions yet.</p>
          )}
          <ul>
            {sessions.map((s, i) => {
              const isCurrent = s.id === currentSessionId
              const isSelected = s.id === selectedId
              return (
                <li key={s.id}>
                  <button
                    className={[
                      'w-full text-left px-4 py-2.5 text-sm transition-colors',
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
                    ].join(' ')}
                    onClick={() => onSelect(s.id)}
                  >
                    <span className="block font-medium">
                      {isCurrent ? 'Current session' : 'Session ' + (sessions.length - i)}
                    </span>
                    <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {formatDate(s.createdAt)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {selectedId && (
          <div className="border-t border-slate-100 dark:border-slate-800 flex-1 min-h-0 overflow-y-auto max-h-72">
            <div className="flex items-center justify-between px-4 py-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Preview</p>
              {selectedId !== currentSessionId && (
                <button
                  onClick={() => onRestore(selectedId)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Load session
                </button>
              )}
            </div>
            {historyLoading && <p className="px-4 pb-2 text-xs text-slate-400">Loading…</p>}
            {!historyLoading && selectedBeats.length === 0 && (
              <p className="px-4 pb-2 text-xs text-slate-400">No beats recorded.</p>
            )}
            {selectedBeats.map((b, i) => (
              <p key={i} className="px-4 pb-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                {b.narrative}
              </p>
            ))}
          </div>
        )}
      </aside>
    </>
  )
}
