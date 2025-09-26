import Link from 'next/link'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/AuthContext'

export default function Signup() {
  const router = useRouter()
  const { signUp, user, isLoading } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await signUp(name, email, password)
      const role = (user && user.role) || (typeof window !== 'undefined' ? JSON.parse(window.localStorage.getItem('user') || '{}')?.role : null)
      if (role === 'admin') router.push('/admin')
      else router.push('/dashboard')
    } catch (e: any) {
      setError(e.message || 'Signup failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="centered">
      <div className="bg-animated"></div>
      <div className="orb purple"></div>
      <div className="orb cyan"></div>
      <div className="orb rose"></div>
      <div className="card">
        <div className="header">
          <h1 className="h1">Create your <span className="brand">MyCollab</span> account</h1>
          <Link className="link" href="/">Home</Link>
        </div>
        <p className="text-muted small">Get started in seconds.</p>
        {error ? (
          <div className="error">{error}</div>
        ) : null}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label">Name</label>
            <input
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
            />
          </div>

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

          <button type="submit" disabled={isSubmitting || isLoading} className="btn btn-success">
            {isSubmitting ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="actions small">
          Already have an account? <Link className="link" href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
} 