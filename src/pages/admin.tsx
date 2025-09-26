import dynamic from 'next/dynamic'

const AdminDashboard = dynamic(() => import('@/components/AdminDashboard'), { ssr: false })

export default function AdminPage() {
  return (
   <div>
  <div className="bg-animated"></div>
  <div className="orb purple"></div>
  <div className="orb cyan"></div>
  <div className="orb rose"></div>
  <AdminDashboard />
   </div>
  )
} 