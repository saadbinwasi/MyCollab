import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import UserBadge from '@/components/UserBadge'

type User = { id: string; name: string; email: string; role: 'user' | 'admin'; createdAt: string }

export default function AdminDashboard() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchUsers() {
    try {
      setError(null)
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
      if (!token) {
        setError('Missing token')
        setLoading(false)
        return
      }
      const res = await fetch('http://localhost:4000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load users')
      }
      const data = await res.json()
      setUsers(data.users || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function updateRole(userId: string, role: 'user' | 'admin') {
    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
      if (!token) return
      const res = await fetch(`http://localhost:4000/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to change role')
      }
      setUsers((prev) => prev.map(u => u.id === userId ? { ...u, role } : u))
    } catch (e) {
      alert((e as any).message || 'Failed to change role')
    }
  }

  function handleLogout() {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('token')
        window.localStorage.removeItem('user')
      }
    } finally {
      router.push('/')
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return (
    <div className="container">
      <header className="header">
        <div className="brand">Admin</div>
        <nav className="nav">
          <UserBadge />
          <a className="button-link secondary" href="/">Home</a>
          <button className="button-link" onClick={handleLogout}>Log out</button>
        </nav>
      </header>

      <section className="section">
        <h2 className="section-title">User management</h2>
        <p className="section-subtitle">View users and manage roles.</p>
        {loading ? (
          <p className="text-muted small">Loading…</p>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {users.map((user) => (
              <div key={user.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{user.name}</div>
                    <div className="small text-muted">{user.email}</div>
                  </div>
                  <span className="small" style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 8 }}>{user.role}</span>
                </div>
                <div className="actions" style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={() => updateRole(user.id, 'admin')} disabled={user.role === 'admin'}>Make admin</button>
                  <button className="btn btn-success" onClick={() => updateRole(user.id, 'user')} disabled={user.role === 'user'}>Make user</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
} 