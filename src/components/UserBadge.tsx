import { useAuth } from '@/context/AuthContext'

export default function UserBadge() {
  const { user } = useAuth()
  if (!user) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 9999, background: 'rgba(255,255,255,0.08)' }}>
      <div style={{ width: 8, height: 8, borderRadius: 9999, background: '#22c55e' }}></div>
      <div style={{ fontWeight: 600 }}>{user.name}</div>
      <div className="small text-muted">{user.email}</div>
    </div>
  )
} 