import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'

type Role = 'user' | 'admin'
export type AuthUser = { id: string; name: string; email: string; role: Role }

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  signIn: (email: string, password: string) => Promise<AuthUser>
  signUp: (name: string, email: string, password: string) => Promise<AuthUser>
  signOut: () => void
  isLoading: boolean
  handleOAuthCallback: (token: string, user: AuthUser) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: any }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const t = window.localStorage.getItem('token')
    const u = window.localStorage.getItem('user')
    if (t && u) {
      setToken(t)
      try { setUser(JSON.parse(u)) } catch {}
    }
    setIsLoading(false)
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    setIsLoading(true)
    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ email, password })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Login failed')
      setToken(data.token)
      setUser(data.user)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('token', data.token)
        window.localStorage.setItem('user', JSON.stringify(data.user))
      }
      return data.user
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string): Promise<AuthUser> => {
    setIsLoading(true)
    try {
      const res = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ name, email, password })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Signup failed')
      setToken(data.token)
      setUser(data.user)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('token', data.token)
        window.localStorage.setItem('user', JSON.stringify(data.user))
      }
      return data.user
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    setToken(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token')
      window.localStorage.removeItem('user')
    }
  }, [])

  const handleOAuthCallback = useCallback((token: string, user: AuthUser) => {
    setToken(token)
    setUser(user)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('token', token)
      window.localStorage.setItem('user', JSON.stringify(user))
    }
  }, [])

  const value = useMemo(() => ({ 
    user, 
    token, 
    signIn, 
    signUp, 
    signOut, 
    isLoading, 
    handleOAuthCallback 
  }), [user, token, isLoading, signIn, signUp, signOut, handleOAuthCallback])
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}