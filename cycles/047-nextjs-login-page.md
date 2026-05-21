---
id: cycle-047
slug: nextjs-login-page
status: pending
source: "Next.js login page at /login — form with email + password, POST to /api/auth/login, stores JWT in localStorage, redirects"
covers: happy-path
group: next-auth
---

## Dependencies

### Package
@testing-library/react@16.x (already installed in client/)
@testing-library/user-event@14.x (already installed)
```
-- render, screen, waitFor from @testing-library/react
-- userEvent.setup() from @testing-library/user-event
-- fireEvent for simple events
```

**(none — UI test mocks fetch and next/navigation)**

## Behavior
Create `client/app/login/page.tsx` — a `'use client'` component with an email input, password input, and submit button. On submit, POSTs to `/api/auth/login`. On success, stores `accessToken` in `localStorage`, decodes the JWT payload to read `role`, then calls `router.push('/narrative')` for USER or `router.push('/admin')` for ADMIN. On failure, shows an error message.

## RED
- **Test file**: `client/__tests__/app/login/page.test.tsx`
- **Assertion**:
  ```tsx
  import React from 'react'
  import { render, screen, fireEvent, waitFor } from '@testing-library/react'
  import LoginPage from '../../../../app/login/page'

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
  ```
- **Why it fails**: `client/app/login/page.tsx` does not exist.

## GREEN
- **Smallest change**: Create `client/app/login/page.tsx` as a `'use client'` component with controlled email + password inputs (htmlFor labels), submit handler that POSTs to `/api/auth/login`, on success stores `accessToken` to localStorage, decodes `atob(token.split('.')[1])` to read role, calls `router.push('/admin')` for ADMIN or `router.push('/narrative')` otherwise.
- **Files touched**: `client/app/login/page.tsx`

## REFACTOR
none
