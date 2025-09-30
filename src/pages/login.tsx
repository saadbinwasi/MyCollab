import Link from 'next/link'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const router = useRouter()
  const { signIn, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const user = await signIn(email, password)
      // Use the returned user data instead of trying to access state
      if (user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    } catch (e: any) {
      setError(e.message || 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOAuthLogin = (provider: 'google') => {
    // Redirect to backend OAuth endpoint
    window.location.href = `http://localhost:4000/api/auth/${provider}`
  }

  return (
    <div className="centered">
      <div className="bg-animated"></div>
      <div className="orb purple"></div>
      <div className="orb cyan"></div>
      <div className="orb rose"></div>
      <div className="card">
        <div className="header">
          <h1 className="h1">Sign in to <span className="brand">MyCollab</span></h1>
          <Link className="link" href="/">Home</Link>
        </div>
   
        {error ? (
          <div className="error">{error}</div>
        ) : null}

        {/* OAuth Button */}
        <div className="oauth-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button 
            type="button"
            onClick={() => handleOAuthLogin('google')}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              backgroundColor: 'white',
              color: '#757575',
              border: '1px solid #dadce0'
            }}
          >
            <svg height="20" width="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '100%', borderTop: '1px solid #e5e7eb' }}></div>
          </div>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', fontSize: '0.875rem' }}>
            <span style={{ backgroundColor: 'white', padding: '0 0.5rem', color: '#6b7280' }}>Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="field">
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={isSubmitting || isLoading} className="btn btn-primary">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="actions small">
          Don't have an account? <Link className="link" href="/signup">Create one</Link>
        </p>
      </div>
    </div>
  )
}