import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import '../styles/activity-log.css'

const ACTION_ICONS = {
  intervention_created: { color: '#2563eb' },
  intervention_assigned: { color: '#7c3aed' },
  intervention_started: { color: '#d97706' },
  intervention_closed: { color: '#16a34a' },
  alert_acknowledged: { color: '#0891b2' },
  alert_resolved: { color: '#059669' },
  equipment_created: { color: '#2563eb' },
  equipment_updated: { color: '#7c3aed' },
  sensor_created: { color: '#0891b2' },
  alert_triggered: { color: '#dc2626' },
}

const ACTION_FILTERS = [
  { value: '', labelKey: 'activity.filter_all' },
  { value: 'intervention_created', labelKey: 'activity.filter_interventions' },
  { value: 'intervention_started', labelKey: 'activity.filter_started' },
  { value: 'intervention_closed', labelKey: 'activity.filter_closed' },
  { value: 'alert_acknowledged', labelKey: 'activity.filter_alerts' },
  { value: 'alert_triggered', labelKey: 'activity.filter_auto_alerts' },
  { value: 'equipment_created', labelKey: 'activity.filter_equipment' },
]

function ActivityLogPage() {
  const { t } = useLanguage()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter) params.append('action', filter)
      params.append('limit', '100')
      const url = `/api/activity/?${params.toString()}`
      const res = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } })
      const data = await res.json()
      setActivities(data)
    } catch (err) {
      console.error('Failed to load activity log:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filter])

  const formatTimeAgo = (dateStr) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now - date
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return t('activity.just_now')
    if (diffMin < 60) return `${diffMin} min`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}j`
    return new Date(dateStr).toLocaleDateString()
  }

  const formatFullDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  // Group by date
  const groupedByDate = activities.reduce((acc, activity) => {
    const dateKey = new Date(activity.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(activity)
    return acc
  }, {})

  return (
    <div className="admin-page">
      <div className="page-heading-row">
        <h1>{t('activity.title')}</h1>
      </div>
      <p className="al-subtitle">{t('activity.subtitle')}</p>

      {/* Filter Bar */}
      <div className="al-toolbar">
        <div className="al-filter-buttons">
          {ACTION_FILTERS.map(f => (
            <button
              key={f.value}
              className={`al-filter-btn ${filter === f.value ? 'al-filter-active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      {loading ? (
        <div className="al-loading">Chargement...</div>
      ) : activities.length === 0 ? (
        <div className="al-empty">
          <p>{t('activity.empty')}</p>
        </div>
      ) : (
        <div className="al-feed">
          {Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date} className="al-date-group">
              <div className="al-date-header">{date}</div>
              <div className="al-timeline">
                {items.map(activity => {
                  const config = ACTION_ICONS[activity.action] || { icon: '•', color: '#64748b' }
                  return (
                    <div key={activity.id} className="al-item">
                      <div className="al-item-line">
                        <div className="al-item-dot" style={{ background: config.color }}>
                        </div>
                      </div>
                      <div className="al-item-content">
                        <div className="al-item-header">
                          <span className="al-item-user">{activity.user_full_name}</span>
                          <span className="al-item-action">{activity.action_display}</span>
                          {activity.target_reference && (
                            <span className="al-item-ref">{activity.target_reference}</span>
                          )}
                        </div>
                        <p className="al-item-desc">{activity.description}</p>
                        <span className="al-item-time" title={formatFullDate(activity.created_at)}>
                          {formatTimeAgo(activity.created_at)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ActivityLogPage
