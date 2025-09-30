import dynamic from 'next/dynamic'
import RoleGuard from '@/components/RoleGuard'

const AdminDashboard = dynamic(() => import('@/components/AdminDashboard'), { ssr: false })

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div>
        <div className="bg-animated"></div>
        <div className="orb purple"></div>
        <div className="orb cyan"></div>
        <div className="orb rose"></div>
        <AdminDashboard />
      </div>
    </RoleGuard>
  )
} 