'use client'

import { useState } from 'react'

export function ActionInput({
  onSubmit,
  disabled,
  isValidating = false,
}: {
  onSubmit: (text: string) => void
  disabled: boolean
  isValidating?: boolean
}) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    if (!value.trim()) return
    onSubmit(value.trim())
    setValue('')
  }

  return (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        placeholder="What do you do?"
        aria-label="Your action"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
        disabled={disabled}
        className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="relative flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700 min-w-[80px]"
      >
        {isValidating && (
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {isValidating ? 'Checking…' : 'Submit'}
      </button>
    </div>
  )
}
