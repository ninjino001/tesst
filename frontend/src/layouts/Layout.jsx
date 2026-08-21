import { useEffect } from 'react'
import '../styles/admin.css'
import '../styles/interventions.css'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import NotificationBell from '../components/NotificationBell'
import { useAuth } from '../contexts/AuthContext'
import { getSidebarForRole } from '../config/roles'

function Layout() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { user, userRole, logout } = useAuth()

  const sidebarItems = getSidebarForRole(userRole)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const userInitials = user
    ? `${(user.first_name || '').charAt(0)}${(user.last_name || '').charAt(0)}`.toUpperCase() || 'U'
    : 'U'

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img src="/Airports-morocco.png" alt="Airports of Morocco" className="sidebar-logo" />
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.key}
              className={({ isActive }) => isActive ? 'sidebar-item active' : 'sidebar-item'}
              to={item.path}
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left">
            <img src="/logo2.png" alt="AIMOS" className="topbar-logo" />
          </div>
          <div className="topbar-right">
            <LanguageSwitcher />
            <NotificationBell />
            <div className="topbar-user-container">
              <div className="text-right user-info-right topbar-profile-link" onClick={() => navigate('/app/profile')}>
                <p className="display-name">{user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : '—'}</p>
                <p className="display-role">{userRole || ''}</p>
              </div>
              <button onClick={handleLogout} className="logout-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {t('logout')}
              </button>
            </div>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
