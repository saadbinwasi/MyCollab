import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/AuthContext'

export default function AuthCallback() {
  const router = useRouter()
  const { handleOAuthCallback } = useAuth()
  const hasProcessed = useRef(false)

  useEffect(() => {
    if (hasProcessed.current) return
    
    const { token, user } = router.query
    
    if (token && user && !hasProcessed.current) {
      hasProcessed.current = true
      try {
        const userData = JSON.parse(decodeURIComponent(user as string))
        handleOAuthCallback(token as string, userData)
        
        // Redirect based on user role
        if (userData.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('OAuth callback error:', error)
        router.push('/login?error=callback_failed')
      }
    } else if (!token && !user && router.isReady) {
      // No token or user data, redirect to login
      router.push('/login?error=no_auth_data')
    }
  }, [router.query, router.isReady, handleOAuthCallback, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}