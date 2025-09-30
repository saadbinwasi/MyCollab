import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/AuthContext'

type Role = 'user' | 'admin'

interface RoleGuardProps {
  allowedRoles: Role[]
  children: React.ReactNode
  redirectTo?: string
}

export default function RoleGuard({ allowedRoles, children, redirectTo = '/' }: RoleGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (isLoading) return

    // If no user is logged in, redirect to home
    if (!user) {
      router.push('/')
      return
    }

    // If user role is not in allowed roles, redirect
    if (!allowedRoles.includes(user.role)) {
      // Redirect to appropriate dashboard based on user role
      if (user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
      return
    }

    setIsChecking(false)
  }, [user, isLoading, allowedRoles, router])

  // Show loading while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    )
  }

  // If user is not authorized, don't render children
  if (!user || !allowedRoles.includes(user.role)) {
    return null
  }

  return <>{children}</>
}