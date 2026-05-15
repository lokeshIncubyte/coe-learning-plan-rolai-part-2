'use client'

import { useState } from 'react'

export function ActionInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (text: string) => void
  disabled: boolean
}) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    if (!value.trim()) return
    onSubmit(value.trim())
    setValue('')
  }

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
        disabled={disabled}
      />
      <button onClick={handleSubmit} disabled={disabled}>
        Submit
      </button>
    </div>
  )
}
