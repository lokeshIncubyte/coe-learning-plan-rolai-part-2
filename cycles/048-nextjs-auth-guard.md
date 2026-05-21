---
id: cycle-048
slug: nextjs-auth-guard
status: done
source: "Next.js client auth guard — narrative page redirects to /login if no token; admin page redirects to /login if no token or role !== ADMIN"
covers: happy-path
group: next-auth
---

## Dependencies

### Package
@testing-library/react@16.x (already installed)
```
-- render triggers useEffect which calls router.push('/login') when localStorage has no token
```

**(none — pure client-side redirect logic)**

## Behavior
Add a `useAuthGuard(requiredRole?: string)` hook in `client/app/narrative/hooks/useAuthGuard.ts` that reads `accessToken` from `localStorage` on mount and calls `router.push('/login')` if absent. For admin pages, also decodes the JWT to check the role and redirects to `/login` if the role does not match. The narrative page imports this hook. The admin page also imports this hook with `requiredRole: 'ADMIN'`. This is the last cycle in the next-auth group. Integration smoke: navigating to `/narrative` in a browser without a token redirects to `/login`; navigating to `/narrative` with a valid USER token shows the narrative page.

## RED
- **Test file**: `client/__tests__/app/narrative/auth-guard.test.tsx`
- **Assertion**:
  ```tsx
  import React from 'react'
  import { render } from '@testing-library/react'

  const push = jest.fn()
  jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

  import { useAuthGuard } from '../../../../app/narrative/hooks/useAuthGuard'

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
  ```
- **Why it fails**: `client/app/narrative/hooks/useAuthGuard.ts` does not exist.

## GREEN
- **Smallest change**: Create `client/app/narrative/hooks/useAuthGuard.ts`:
  ```ts
  'use client'
  import { useEffect } from 'react'
  import { useRouter } from 'next/navigation'
  export function useAuthGuard(requiredRole?: string) {
    const router = useRouter()
    useEffect(() => {
      const token = localStorage.getItem('accessToken')
      if (!token) { router.push('/login'); return }
      if (requiredRole) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          if (payload.role !== requiredRole) router.push('/login')
        } catch { router.push('/login') }
      }
    }, [router, requiredRole])
  }
  ```
  Import and call `useAuthGuard()` at the top of `client/app/narrative/page.tsx`.
- **Files touched**: `client/app/narrative/hooks/useAuthGuard.ts`, `client/app/narrative/page.tsx`

## REFACTOR
none
