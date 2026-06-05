import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('renders UploadPanel with file input and Upload button', async () => {
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

    const fileInput = screen.getByLabelText(/choose file/i)
    expect(fileInput).toHaveAttribute('accept', '.pdf,.txt')
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
  })
})

describe('AdminPage — config editor', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'header.eyJyb2xlIjoiQURNSU4ifQ.sig')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('fetches spec from /api/config/update-spec and displays it in a textarea', async () => {
    const mockSpec = { version: 1, actions: ['jump', 'run'] }

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/admin/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            entityCount: 1, edgeCount: 0, sessionCount: 0, historyCount: 0, latestHistoryAt: null,
          }),
        } as any)
      }
      if (url.includes('/api/config/update-spec')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSpec),
        } as any)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    render(<AdminPage />)

    await waitFor(() =>
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    )

    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveValue(JSON.stringify(mockSpec, null, 2))
    expect(screen.getByText(/update spec/i)).toBeInTheDocument()
  })

  it('lets user edit the textarea and clicking Save Spec PUTs the edited JSON', async () => {
    const mockSpec = { version: 1, actions: [] }
    const savedSpec = { version: 2, actions: ['run'] }

    global.fetch = jest.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/api/admin/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            entityCount: 1, edgeCount: 0, sessionCount: 0, historyCount: 0, latestHistoryAt: null,
          }),
        } as any)
      }
      if (url.includes('/api/config/update-spec') && (!options || options.method !== 'PUT')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSpec),
        } as any)
      }
      if (url.includes('/api/config/update-spec') && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(savedSpec),
        } as any)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    render(<AdminPage />)

    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument())

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: JSON.stringify(savedSpec) } })

    await userEvent.click(screen.getByRole('button', { name: /save spec/i }))

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/config/update-spec',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer header.eyJyb2xlIjoiQURNSU4ifQ.sig',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(savedSpec),
        }),
      )
    )

    expect(await screen.findByText(/saved!/i)).toBeInTheDocument()
  })
})
