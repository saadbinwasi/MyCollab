import dynamic from 'next/dynamic'

const UserDashboard = dynamic(() => import('@/components/UserDashboard'), { ssr: false })

export default function DashboardPage() {
  return (
   <div className="dashboard-theme">
  <div className="bg-solid-brand"></div>
  <UserDashboard />
   </div>
  )
} 