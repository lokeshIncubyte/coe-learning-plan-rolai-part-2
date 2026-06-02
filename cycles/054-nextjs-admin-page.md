---
id: cycle-054
slug: nextjs-admin-page
status: done
source: "No client/app/admin/page.tsx — create admin page that renders entityCount, edgeCount, sessionCount, historyCount, latestHistoryAt"
covers: happy-path
group: admin-page
boundary-covered-by: cycle-053
---

## Dependencies

### Package
fetch (built-in)
```
-- fetch('/api/admin/stats', { headers: { Authorization: 'Bearer <token>' } }): Promise<Response>
-- Response.json(): Promise<{ entityCount: number; edgeCount: number; sessionCount: number; historyCount: number; latestHistoryAt: string | null }>
-- Token read from localStorage.getItem('accessToken')
```

## Behavior

Create `client/app/admin/page.tsx` — a `'use client'` component that calls `useAuthGuard('ADMIN')` (redirects to `/login` if token absent or role !== ADMIN), fetches `/api/admin/stats` with `Authorization: Bearer <token>` from localStorage on mount, and renders the five stat fields: `entityCount`, `edgeCount`, `sessionCount`, `historyCount`, `latestHistoryAt`. Shows "Loading…" while the fetch is in-flight. This is the last cycle in the `admin-page` group. Integration smoke: with NestJS + DB running, login as `admin@platform.com`, call `GET /api/admin/stats` with the ADMIN JWT → 200 with all five fields as numbers/null; the admin page renders those counts without error.

## RED
- **Test file**: `client/__tests__/app/admin/page.test.tsx`
- **Assertion**:
  ```ts
  import React from 'react'
  import { render, screen, waitFor } from '@testing-library/react'
  import AdminPage from '../../../app/admin/page'

  const mockPush = jest.fn()
  jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
  jest.mock('../../../app/narrative/hooks/useAuthGuard', () => ({ useAuthGuard: () => undefined }))

  describe('AdminPage', () => {
    beforeEach(() => {
      mockPush.mockClear()
      localStorage.setItem('accessToken', 'header.eyJyb2xlIjoiQURNSU4ifQ.sig')
    })

    afterEach(() => {
      localStorage.clear()
    })

    it('fetches and renders admin stats', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          entityCount: 5,
          edgeCount: 3,
          sessionCount: 2,
          historyCount: 10,
          latestHistoryAt: '2026-05-21T10:00:00Z',
        }),
      } as any)

      render(<AdminPage />)

      await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument())
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('shows loading state before fetch completes', () => {
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}))
      render(<AdminPage />)
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })
  ```
- **Why it fails**: `client/app/admin/page.tsx` does not exist.

## GREEN
- **Smallest change**: Create `client/app/admin/page.tsx`:
  ```tsx
  'use client'
  import { useEffect, useState } from 'react'
  import { useAuthGuard } from '../narrative/hooks/useAuthGuard'

  type Stats = {
    entityCount: number
    edgeCount: number
    sessionCount: number
    historyCount: number
    latestHistoryAt: string | null
  }

  export default function AdminPage() {
    useAuthGuard('ADMIN')
    const [stats, setStats] = useState<Stats | null>(null)

    useEffect(() => {
      const token = localStorage.getItem('accessToken') ?? ''
      fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(setStats)
    }, [])

    if (!stats) return <p>Loading…</p>

    return (
      <main>
        <h1>Admin</h1>
        <dl>
          <dt>Entities</dt><dd>{stats.entityCount}</dd>
          <dt>Edges</dt><dd>{stats.edgeCount}</dd>
          <dt>Sessions</dt><dd>{stats.sessionCount}</dd>
          <dt>History entries</dt><dd>{stats.historyCount}</dd>
          <dt>Latest history</dt><dd>{stats.latestHistoryAt ?? 'none'}</dd>
        </dl>
      </main>
    )
  }
  ```
- **Files touched**: `client/app/admin/page.tsx`

## REFACTOR
none
