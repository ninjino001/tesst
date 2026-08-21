import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { fetchNotifications, markNotificationsRead, markAllNotificationsRead } from '../services/notificationService'
import '../styles/notifications.css'

function NotificationBell() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef(null)

  // Load notifications
  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
    } catch (err) {
      // Silently fail
    }
  }

  // Poll every 15 seconds
  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 15000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = () => {
    setOpen(!open)
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead()
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const handleNotificationClick = async (notif) => {
    // Mark as read
    if (!notif.is_read) {
      await markNotificationsRead([notif.id])
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    // Navigate to the relevant page based on notification type
    setOpen(false)
    if (notif.type === 'intervention_assigned' || notif.type === 'intervention_closed') {
      navigate('/app/interventions')
    } else {
      navigate('/app/alerts')
    }
  }

  const formatTimeAgo = (dateStr) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now - date
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return t('notifications.just_now')
    if (diffMin < 60) return `${diffMin}min`
    if (diffHours < 24) return `${diffHours}h`
    return `${diffDays}j`
  }

  return (
    <div className="notif-container" ref={dropdownRef}>
      <button className="notif-bell-btn" onClick={handleToggle}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <h4>{t('notifications.title')}</h4>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={handleMarkAllRead}>
                {t('notifications.mark_all_read')}
              </button>
            )}
          </div>
          <div className="notif-dropdown-body">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <p>{t('notifications.empty')}</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`notif-item ${!notif.is_read ? 'notif-unread' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notif-item-icon">
                    {notif.type === 'alert_critical' ? (
                      <span className="notif-dot notif-dot-critical"></span>
                    ) : (
                      <span className="notif-dot notif-dot-warning"></span>
                    )}
                  </div>
                  <div className="notif-item-content">
                    <span className="notif-item-title">{notif.title}</span>
                    <span className="notif-item-msg">{notif.message}</span>
                    <span className="notif-item-time">{formatTimeAgo(notif.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
