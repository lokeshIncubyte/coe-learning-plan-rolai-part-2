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
