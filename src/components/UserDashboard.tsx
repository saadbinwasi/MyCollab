import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/AuthContext'
import UserBadge from '@/components/UserBadge'
import BoardsView from '@/components/BoardsView'

type Tab = 'boards' | 'members' | 'settings' | 'powerups' | 'billing' | 'export'

export default function UserDashboard() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('boards')

  function handleLogout() {
    signOut()
    router.push('/')
  }

  return (
    <div className="container">
      <header className="header">
        <div className="brand">MyCollab</div>
        <nav className="nav">
          <UserBadge />
          <Link className="button-link secondary" href="/">Home</Link>
          {user?.role === 'admin' ? (
            <Link className="button-link" href="/admin">Admin</Link>
          ) : null}
          <button className="button-link" onClick={handleLogout}>Log out</button>
        </nav>
      </header>

      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setSidebarOpen(true)}>Menu</button>
        <div className="brand">Dashboard</div>
      </div>
      <div className={"scrim" + (sidebarOpen ? " show" : "")} onClick={() => setSidebarOpen(false)}></div>

      <div className="dashboard-layout">
        <aside className={"sidebar" + (sidebarOpen ? " open" : "")}> 
          <div className="sidebar-group">
            <div className="sidebar-title">Personal Settings</div>
            <nav className="sidebar-nav">
              <a className="sidebar-link" href="#">⚙️ Profile and Visibility</a>
              <a className="sidebar-link" href="#">🔧 Settings</a>
              <a className="sidebar-link" href="#">📈 Activity</a>
              <a className="sidebar-link" href="#">💳 Cards</a>
            </nav>
          </div>

          <div className="sidebar-group">
            <div className="sidebar-title">Workspace</div>
            <nav className="sidebar-nav">
              <button className={"sidebar-link" + (tab === 'boards' ? " active" : "")} onClick={() => setTab('boards')}>🗂️ Boards</button>
              <button className={"sidebar-link" + (tab === 'members' ? " active" : "")} onClick={() => setTab('members')}>👥 Members</button>
              <button className={"sidebar-link" + (tab === 'settings' ? " active" : "")} onClick={() => setTab('settings')}>⚙️ Settings</button>
              <button className={"sidebar-link" + (tab === 'powerups' ? " active" : "")} onClick={() => setTab('powerups')}>🚀 Power-Ups</button>
              <button className={"sidebar-link" + (tab === 'billing' ? " active" : "")} onClick={() => setTab('billing')}>💳 Billing</button>
              <button className={"sidebar-link" + (tab === 'export' ? " active" : "")} onClick={() => setTab('export')}>⬇️ Export</button>
            </nav>
          </div>
        </aside>

        <main>
          {tab === 'boards' ? (
            <BoardsView />
          ) : (
            <section className="section">
              <h2 className="section-title" style={{ marginBottom: 8 }}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</h2>
              <p className="section-subtitle">This section is under construction.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}