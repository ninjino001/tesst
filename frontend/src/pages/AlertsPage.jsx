import { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { fetchAlerts, fetchAlertStats, acknowledgeAlert, resolveAlert } from '../services/alertService'
import '../styles/interventions.css'

const LEVEL_CONFIG = {
  critical: { label_fr: 'Critique', label_en: 'Critical', class: 'alert-level-critical' },
  warning: { label_fr: 'Avertissement', label_en: 'Warning', class: 'alert-level-warning' },
  info: { label_fr: 'Information', label_en: 'Info', class: 'alert-level-info' },
}

const STATUS_CONFIG = {
  active: { label_fr: 'Active', label_en: 'Active', class: 'alert-status-active' },
  acknowledged: { label_fr: 'Prise en charge', label_en: 'Acknowledged', class: 'alert-status-acknowledged' },
  resolved: { label_fr: 'Résolue', label_en: 'Resolved', class: 'alert-status-resolved' },
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function mapAlert(alert) {
  return {
    id: alert.reference,
    equipment: alert.equipment_name,
    equipmentRef: alert.equipment_reference,
    sensor: alert.sensor_name,
    value: `${alert.measured_value}${alert.unit}`,
    threshold: `${alert.threshold_value}${alert.unit}`,
    level: alert.level,
    status: alert.status,
    message: alert.message,
    createdAt: formatDate(alert.created_at),
    acknowledgedAt: formatDate(alert.acknowledged_at),
    reference: alert.reference,
  }
}

function AlertsPage() {
  const { t, lang } = useLanguage()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [counts, setCounts] = useState({ all: 0, active: 0, acknowledged: 0, resolved: 0, critical: 0 })

  const loadData = async () => {
    try {
      setLoading(true)
      const [alertsData, statsData] = await Promise.all([
        fetchAlerts(),
        fetchAlertStats(),
      ])
      setAlerts(alertsData.map(mapAlert))
      setCounts({
        all: statsData.total,
        active: statsData.active,
        acknowledged: statsData.acknowledged,
        resolved: statsData.resolved,
        critical: statsData.critical,
      })
    } catch (error) {
      console.error('Failed to load alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = useMemo(() => {
    let data = [...alerts]
    if (activeTab === 'active') data = data.filter(a => a.status === 'active')
    else if (activeTab === 'acknowledged') data = data.filter(a => a.status === 'acknowledged')
    else if (activeTab === 'resolved') data = data.filter(a => a.status === 'resolved')

    if (search) {
      const s = search.toLowerCase()
      data = data.filter(a => a.id.toLowerCase().includes(s) || a.equipment.toLowerCase().includes(s) || a.message.toLowerCase().includes(s))
    }
    if (filterLevel) data = data.filter(a => a.level === filterLevel)
    return data
  }, [alerts, activeTab, search, filterLevel])

  const handleAcknowledge = async (reference) => {
    try {
      setActionLoading(true)
      await acknowledgeAlert(reference)
      await loadData()
      setSelectedAlert(null)
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResolve = async (reference) => {
    try {
      setActionLoading(true)
      await resolveAlert(reference)
      await loadData()
      setSelectedAlert(null)
    } catch (error) {
      console.error('Failed to resolve alert:', error)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="page-heading-row">
          <h1>{t('alerts.title')}</h1>
        </div>
        <div className="eq-table-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="page-heading-row">
        <h1>{t('alerts.title')}</h1>
      </div>

      {/* KPI Cards */}
      <div className="eq-kpi-row">
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('alerts.kpi_critical')}</span>
            <span className="eq-kpi-value">{counts.critical}</span>
          </div>
        </div>
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('alerts.kpi_active')}</span>
            <span className="eq-kpi-value">{counts.active}</span>
          </div>
        </div>
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('alerts.kpi_acknowledged')}</span>
            <span className="eq-kpi-value">{counts.acknowledged}</span>
          </div>
        </div>
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('alerts.kpi_resolved')}</span>
            <span className="eq-kpi-value">{counts.resolved}</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="eq-toolbar">
        <div className="eq-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder={t('alerts.search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="eq-filters">
          <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
            <option value="">{t('alerts.filter_all_levels')}</option>
            <option value="critical">{t('alerts.level_critical')}</option>
            <option value="warning">{t('alerts.level_warning')}</option>
            <option value="info">{t('alerts.level_info')}</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="eq-tabs">
        <button className={`eq-tab ${activeTab === 'all' ? 'eq-tab-active' : ''}`} onClick={() => setActiveTab('all')}>
          {t('alerts.tab_all')} ({counts.all})
        </button>
        <button className={`eq-tab eq-tab-red ${activeTab === 'active' ? 'eq-tab-active' : ''}`} onClick={() => setActiveTab('active')}>
          {t('alerts.tab_active')} ({counts.active})
        </button>
        <button className={`eq-tab eq-tab-orange ${activeTab === 'acknowledged' ? 'eq-tab-active' : ''}`} onClick={() => setActiveTab('acknowledged')}>
          {t('alerts.tab_acknowledged')} ({counts.acknowledged})
        </button>
        <button className={`eq-tab eq-tab-green ${activeTab === 'resolved' ? 'eq-tab-active' : ''}`} onClick={() => setActiveTab('resolved')}>
          {t('alerts.tab_resolved')} ({counts.resolved})
        </button>
      </div>

      {/* Table */}
      <div className="eq-table-panel">
        <div className="table-wrapper">
          <table className="data-table eq-table">
            <thead>
              <tr>
                <th>{t('alerts.col_id')}</th>
                <th>{t('alerts.col_equipment')}</th>
                <th>{t('alerts.col_sensor')}</th>
                <th>{t('alerts.col_value')}</th>
                <th>{t('alerts.col_level')}</th>
                <th>{t('alerts.col_status')}</th>
                <th>{t('alerts.col_date')}</th>
                <th>{t('alerts.col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(alert => (
                <tr key={alert.id}>
                  <td className="eq-id-cell" style={{ color: 'var(--primary)', fontWeight: 700 }}>{alert.id}</td>
                  <td>
                    <div className="eq-name-cell">
                      <span className="eq-name">{alert.equipment}</span>
                      <span className="eq-model">{alert.equipmentRef}</span>
                    </div>
                  </td>
                  <td>{alert.sensor}</td>
                  <td><strong>{alert.value}</strong> <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>/ {alert.threshold}</span></td>
                  <td><span className={`alert-level-badge ${LEVEL_CONFIG[alert.level]?.class || ''}`}>{LEVEL_CONFIG[alert.level]?.[lang === 'fr' ? 'label_fr' : 'label_en'] || alert.level}</span></td>
                  <td><span className={`status-badge-sm ${STATUS_CONFIG[alert.status]?.class || ''}`}>{STATUS_CONFIG[alert.status]?.[lang === 'fr' ? 'label_fr' : 'label_en'] || alert.status}</span></td>
                  <td style={{ fontSize: '0.85rem' }}>{alert.createdAt}</td>
                  <td>
                    <button className="eq-action-btn" onClick={() => setSelectedAlert(alert)} title="Détails">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="8" className="eq-empty">{t('alerts.no_results')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="modal-backdrop" onClick={() => setSelectedAlert(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', width: '90vw' }}>
            <div className="modal-header">
              <h3>{selectedAlert.id} — {t('alerts.detail_title')}</h3>
              <button className="icon-button" onClick={() => setSelectedAlert(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="detail-row"><span className="detail-label">{t('alerts.col_equipment')}</span><span className="detail-value">{selectedAlert.equipment}</span></div>
              <div className="detail-row"><span className="detail-label">{t('alerts.col_sensor')}</span><span className="detail-value">{selectedAlert.sensor}</span></div>
              <div className="detail-row"><span className="detail-label">{t('alerts.detail_measured')}</span><span className="detail-value"><strong>{selectedAlert.value}</strong></span></div>
              <div className="detail-row"><span className="detail-label">{t('alerts.detail_threshold')}</span><span className="detail-value">{selectedAlert.threshold}</span></div>
              <div className="detail-row"><span className="detail-label">{t('alerts.col_level')}</span><span className={`alert-level-badge ${LEVEL_CONFIG[selectedAlert.level]?.class}`}>{LEVEL_CONFIG[selectedAlert.level]?.[lang === 'fr' ? 'label_fr' : 'label_en']}</span></div>
              <div className="detail-row"><span className="detail-label">{t('alerts.col_status')}</span><span className={`status-badge-sm ${STATUS_CONFIG[selectedAlert.status]?.class}`}>{STATUS_CONFIG[selectedAlert.status]?.[lang === 'fr' ? 'label_fr' : 'label_en']}</span></div>
              <div className="detail-row"><span className="detail-label">{t('alerts.message')}</span><span className="detail-value">{selectedAlert.message}</span></div>
              <div className="detail-row"><span className="detail-label">{t('alerts.detail_created')}</span><span className="detail-value">{selectedAlert.createdAt}</span></div>
              {selectedAlert.acknowledgedAt && (
                <div className="detail-row"><span className="detail-label">{t('alerts.detail_acknowledged')}</span><span className="detail-value">{selectedAlert.acknowledgedAt}</span></div>
              )}
            </div>
            <div className="modal-actions">
              {selectedAlert.status === 'active' && (
                <button className="btn-primary" onClick={() => handleAcknowledge(selectedAlert.reference)} disabled={actionLoading}>
                  {actionLoading ? '...' : t('alerts.acknowledge_btn')}
                </button>
              )}
              {selectedAlert.status === 'acknowledged' && (
                <button className="btn-primary" onClick={() => handleResolve(selectedAlert.reference)} disabled={actionLoading}>
                  {actionLoading ? '...' : t('alerts.resolve_btn')}
                </button>
              )}
              <button className="icon-button" onClick={() => setSelectedAlert(null)}>{t('alerts.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AlertsPage
