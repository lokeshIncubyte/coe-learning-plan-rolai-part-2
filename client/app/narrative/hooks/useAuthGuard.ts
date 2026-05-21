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
