import React from 'react'
import { render } from '@testing-library/react'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

import { useAuthGuard } from '../../../app/narrative/hooks/useAuthGuard'

function TestComponent({ requiredRole }: { requiredRole?: string }) {
  useAuthGuard(requiredRole)
  return <div>protected</div>
}

describe('useAuthGuard', () => {
  beforeEach(() => {
    localStorage.clear()
    push.mockClear()
  })

  it('redirects to /login when no token in localStorage', () => {
    render(<TestComponent />)
    expect(push).toHaveBeenCalledWith('/login')
  })

  it('does not redirect when token is present', () => {
    localStorage.setItem('accessToken', 'header.eyJyb2xlIjoiVVNFUiJ9.sig')
    render(<TestComponent />)
    expect(push).not.toHaveBeenCalled()
  })

  it('redirects to /login when token present but role does not match ADMIN requirement', () => {
    localStorage.setItem('accessToken', 'header.eyJyb2xlIjoiVVNFUiJ9.sig')
    render(<TestComponent requiredRole="ADMIN" />)
    expect(push).toHaveBeenCalledWith('/login')
  })
})
