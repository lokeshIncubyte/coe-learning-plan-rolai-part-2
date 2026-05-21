import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '../../../app/login/page'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

describe('LoginPage', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('renders email and password inputs and a submit button', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('calls /api/auth/login on submit and stores token', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'header.eyJyb2xlIjoiVVNFUiJ9.sig' }),
    } as any)

    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@platform.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'login' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' })))
    expect(localStorage.getItem('accessToken')).toBeTruthy()
  })
})
