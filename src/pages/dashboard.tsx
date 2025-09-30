import dynamic from 'next/dynamic'
import RoleGuard from '@/components/RoleGuard'

const UserDashboard = dynamic(() => import('@/components/UserDashboard'), { ssr: false })

export default function DashboardPage() {
  return (
    <RoleGuard allowedRoles={['user']}>
      <div className="dashboard-theme">
        <div className="bg-solid-brand"></div>
        <UserDashboard />
      </div>
    </RoleGuard>
  )
}