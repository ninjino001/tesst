import { useEffect, useState, useMemo } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { fetchUsers } from '../services/userService'
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import '../styles/dashboard.css'

const ROLE_COLORS = {
  'Superviseur': '#7c3aed',
  'Responsable maintenance': '#2563eb',
  'Technicien': '#0891b2',
  'Responsable exploitation': '#059669',
}

function AdminDashboardPage() {
  const { t } = useLanguage()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetchUsers()
      .then((data) => { setUsers(data); setError(null) })
      .catch((err) => { setError(err.message) })
      .finally(() => { setLoading(false) })
  }, [])

  // Stats
  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter(u => u.is_active).length
    const inactive = total - active
    const online = users.filter(u => !!u.last_login).length
    const offline = total - online
    return { total, active, inactive, online, offline }
  }, [users])

  // Users by role for pie chart
  const usersByRole = useMemo(() => {
    const map = {}
    users.forEach(u => {
      const role = u.role_title || 'Non défini'
      map[role] = (map[role] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      color: ROLE_COLORS[name] || '#64748b'
    }))
  }, [users])

  // Activity over last 7 days (simulated from last_login data)
  const activityData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayLabel = date.toLocaleDateString('fr-FR', { weekday: 'short' })
      const count = users.filter(u => {
        if (!u.last_login) return false
        const loginDate = new Date(u.last_login)
        return loginDate.toDateString() === date.toDateString()
      }).length
      days.push({ day: dayLabel, connexions: count })
    }
    return days
  }, [users])

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <h1>{t('admin_dashboard.title')}</h1>
      </div>

      {/* KPI Cards */}
      <div className="kpi-row">
        <div className="kpi-card kpi-blue">
          <div className="kpi-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{stats.total}</span>
            <span className="kpi-label">{t('admin_dashboard.total_users')}</span>
          </div>
        </div>
        <div className="kpi-card kpi-green">
          <div className="kpi-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{stats.active}</span>
            <span className="kpi-label">{t('admin_dashboard.active_users')}</span>
          </div>
        </div>
        <div className="kpi-card kpi-purple">
          <div className="kpi-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{stats.online}</span>
            <span className="kpi-label">{t('admin_dashboard.online_now')}</span>
          </div>
        </div>
        <div className="kpi-card kpi-red">
          <div className="kpi-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{stats.inactive}</span>
            <span className="kpi-label">{t('admin_dashboard.inactive_users')}</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid-2col">
        {/* Users by Role - Pie */}
        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>{t('admin_dashboard.users_by_role')}</h3>
            <span className="chart-badge">{stats.total} {t('admin_dashboard.total_label')}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={usersByRole}
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                dataKey="value"
                label={({ name, value }) => `${name} (${value})`}
                labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
              >
                {usersByRole.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Connexions last 7 days - Bar */}
        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>{t('admin_dashboard.recent_activity')}</h3>
            <span className="chart-badge">{t('admin_dashboard.last_7_days')}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={activityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} />
              <Bar dataKey="connexions" fill="#2563eb" radius={[6, 6, 0, 0]} name={t('admin_dashboard.connexions')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Users Table */}
      <div className="chart-panel">
        <div className="chart-panel-header">
          <h3>{t('admin_dashboard.all_users')}</h3>
          <span className="chart-badge">{stats.online} {t('admin_dashboard.online_label')} / {stats.offline} {t('admin_dashboard.offline_label')}</span>
        </div>

        {error && <div className="form-error" style={{ color: '#b91c1c' }}>{error}</div>}
        {loading ? (
          <div className="loading-state">{t('users.loading')}</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('users.full_name')}</th>
                  <th>{t('users.email')}</th>
                  <th>{t('users.role')}</th>
                  <th>{t('users.last_login')}</th>
                  <th>{t('admin_dashboard.status')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 600 }}>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username}</td>
                    <td>{user.email || '—'}</td>
                    <td><span className="eq-category-badge">{user.role_title || '—'}</span></td>
                    <td>{user.last_login ? new Date(user.last_login).toLocaleString() : '—'}</td>
                    <td>
                      <span className={`status-badge ${user.last_login ? 'status-active' : 'status-inactive'}`}>
                        {user.last_login ? t('admin_dashboard.online') : t('admin_dashboard.offline')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboardPage
