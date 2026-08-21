import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { ROLES } from '../config/roles'
import { fetchEquipmentDetail } from '../services/equipmentService'
import { fetchSensorLatest } from '../services/dashboardService'
import { fetchInterventions } from '../services/interventionService'
import { fetchAlerts } from '../services/alertService'
import '../styles/equipment.css'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function getStatusLabel(status, t) {
  const map = {
    operational: t('equipment.status_operational'),
    under_maintenance: t('equipment.status_maintenance'),
    out_of_service: t('equipment.status_out'),
  }
  return map[status] || status
}

function getCriticalityLabel(criticality, t) {
  const map = {
    low: t('equipment.crit_low'),
    medium: t('equipment.crit_medium'),
    high: t('equipment.crit_high'),
    critical: t('equipment.crit_critical'),
  }
  return map[criticality] || criticality
}

function EquipmentDetailPage() {
  const { id } = useParams()
  const { t } = useLanguage()
  const { userRole } = useAuth()
  const navigate = useNavigate()
  const canEdit = userRole === ROLES.ADMIN || userRole === ROLES.MAINTENANCE_MANAGER

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [eq, setEq] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const [detail, sensors, interventionsData, alertsData] = await Promise.all([
          fetchEquipmentDetail(id),
          fetchSensorLatest(id),
          fetchInterventions({ equipment: id }),
          fetchAlerts({ equipment: id }),
        ])

        if (cancelled) return

        // Map sensors to indicators
        const indicators = (sensors || []).map(sensor => ({
          label: sensor.name || sensor.type,
          value: sensor.value != null ? String(sensor.value) : '—',
          unit: sensor.unit || '',
          status: sensor.status || 'Normal',
        }))

        // Compute health score: percentage of sensors with status 'Normal'
        const totalSensors = (sensors || []).length
        const normalSensors = (sensors || []).filter(s => s.status === 'Normal').length
        const healthScore = totalSensors > 0 ? Math.round((normalSensors / totalSensors) * 100) : 100
        const healthPercent = healthScore

        // Map interventions to recentInterventions (first 4)
        const interventionsList = Array.isArray(interventionsData) ? interventionsData : (interventionsData?.results || [])
        const recentInterventions = interventionsList.slice(0, 4).map(int => ({
          id: int.reference || int.id,
          type: int.intervention_type || int.type || '—',
          technician: int.technician_name || int.technician || '—',
          date: formatDate(int.created_at || int.date),
          description: int.description || '—',
          status: int.status || '—',
        }))

        // Compute linked info
        const alertsList = Array.isArray(alertsData) ? alertsData : (alertsData?.results || [])
        const activeAlerts = alertsList.filter(a => a.status === 'Active' || a.status === 'active').length
        const linkedInfo = {
          interventions: interventionsList.length,
          openAlerts: activeAlerts,
          spareParts: 0,
          documents: 0,
        }

        // Build the equipment object matching existing JSX expectations
        const equipment = {
          id: detail.reference || detail.id,
          name: detail.name || '—',
          model: detail.model || '—',
          serialNumber: detail.serial_number || '—',
          manufacturer: detail.manufacturer || '—',
          installationDate: formatDate(detail.installation_date),
          warrantyExpiry: formatDate(detail.warranty_expiry),
          description: detail.description || '—',
          category: detail.category_name || '—',
          categoryDesc: detail.category_name || '—',
          status: detail.status || 'Unknown',
          operatingSince: formatDateTime(detail.created_at),
          lastCheck: formatDateTime(detail.updated_at),
          lastMaintenance: formatDate(detail.last_maintenance),
          nextMaintenance: formatDate(detail.next_maintenance),
          nextDays: detail.days_until_maintenance != null ? detail.days_until_maintenance : '—',
          healthScore,
          healthPercent,
          criticality: detail.criticality || '—',
          airport: detail.location || '—',
          terminal: '—',
          specificLocation: detail.location || '—',
          image: detail.image || null,
          indicators,
          recentInterventions,
          linkedInfo,
        }

        setEq(equipment)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load equipment details')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [id])



  if (loading) {
    return (
      <div className="eq-detail-page">
        <div className="eq-detail-header">
          <h1>{t('common.loading')}</h1>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <div className="eq-loading-spinner" style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="eq-detail-page">
        <div className="eq-detail-header">
          <h1>{t('equipment.error') || 'Error'}</h1>
          <p className="eq-subtitle">{error}</p>
        </div>
      </div>
    )
  }

  if (!eq) return null

  return (
    <div className="eq-detail-page">
      {/* Header */}
      <div className="eq-detail-header">
        <h1>{eq.name}</h1>
        <p className="eq-subtitle">{t('equipment.detail_subtitle')}</p>
      </div>

      {/* Summary Cards */}
      <div className="eq-detail-summary">
        <div className="eq-summary-card">
          <div className="eq-summary-icon eq-summary-green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <div>
            <span className="eq-summary-label">{t('equipment.detail_status')}</span>
            <span className={`eq-status-badge ${eq.status === 'operational' ? 'eq-status-operational' : eq.status === 'under_maintenance' ? 'eq-status-maintenance' : 'eq-status-out'}`}>
              <span className="eq-status-dot"></span> {getStatusLabel(eq.status, t)}
            </span>
          </div>
        </div>
        <div className="eq-summary-card">
          <div className="eq-summary-icon eq-summary-red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </div>
          <div>
            <span className="eq-summary-label">{t('equipment.detail_criticality')}</span>
            <span className={`eq-crit-badge ${eq.criticality === 'critical' ? 'eq-crit-critical' : eq.criticality === 'high' ? 'eq-crit-high' : eq.criticality === 'medium' ? 'eq-crit-medium' : 'eq-crit-low'}`}>{getCriticalityLabel(eq.criticality, t)}</span>
          </div>
        </div>
        <div className="eq-summary-card">
          <div className="eq-summary-icon eq-summary-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div>
            <span className="eq-summary-label">{t('equipment.detail_location')}</span>
            <span className="eq-summary-value">{eq.specificLocation}</span>
            <span className="eq-summary-meta">{eq.airport}</span>
          </div>
        </div>
        <div className="eq-summary-card">
          <div className="eq-summary-icon eq-summary-purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z"/></svg>
          </div>
          <div>
            <span className="eq-summary-label">{t('equipment.detail_category')}</span>
            <span className="eq-summary-value">{eq.category}</span>
            <span className="eq-summary-meta">{eq.categoryDesc}</span>
          </div>
        </div>
        <div className="eq-summary-card">
          <div className="eq-summary-icon eq-summary-teal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div>
            <span className="eq-summary-label">{t('equipment.detail_next_maintenance')}</span>
            <span className="eq-summary-value">{eq.nextMaintenance}</span>
            <span className="eq-summary-meta eq-text-primary">{t('equipment.in_days').replace('{0}', eq.nextDays)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {/* Actions */}
      <div className="eq-detail-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="eq-btn-sensors" onClick={() => navigate(`/app/equipment/${id}/sensors`)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            {t('sensor_charts.btn_sensor_charts')}
          </button>
          {canEdit && (
            <button className="eq-btn-edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              {t('equipment.edit_equipment')}
            </button>
          )}
      </div>

      {/* Content */}
      <div className="eq-detail-content">
          <div className="eq-overview-layout">
            {/* Left: General + Status */}
            <div className="eq-overview-main">
              <div className="eq-info-grid">
                {/* General Information */}
                <div className="eq-info-panel">
                  <h3>{t('equipment.general_info')}</h3>
                  <div className="eq-info-rows">
                    <div className="eq-info-row"><span>{t('equipment.detail_eq_id')}</span><span>{eq.id}</span></div>
                    <div className="eq-info-row"><span>{t('equipment.detail_name')}</span><span>{eq.name}</span></div>
                    <div className="eq-info-row"><span>{t('equipment.detail_model')}</span><span>{eq.model}</span></div>
                    <div className="eq-info-row"><span>{t('equipment.detail_serial')}</span><span>{eq.serialNumber}</span></div>
                    <div className="eq-info-row"><span>{t('equipment.detail_manufacturer')}</span><span>{eq.manufacturer}</span></div>
                    <div className="eq-info-row"><span>{t('equipment.detail_installation')}</span><span>{eq.installationDate}</span></div>
                    <div className="eq-info-row"><span>{t('equipment.detail_warranty')}</span><span>{eq.warrantyExpiry}</span></div>
                    <div className="eq-info-row"><span>{t('equipment.detail_description')}</span><span>{eq.description}</span></div>
                  </div>
                </div>

                {/* Status Information */}
                <div className="eq-info-panel">
                  <h3>{t('equipment.status_info')}</h3>
                  <div className="eq-info-rows">
                    <div className="eq-info-row"><span>{t('equipment.detail_current_status')}</span><span className={`eq-status-badge ${eq.status === 'operational' ? 'eq-status-operational' : 'eq-status-maintenance'}`}><span className="eq-status-dot"></span> {getStatusLabel(eq.status, t)}</span></div>
                    <div className="eq-info-row"><span>{t('equipment.detail_operating_since')}</span><span>{eq.operatingSince}</span></div>
                    <div className="eq-info-row"><span>{t('equipment.detail_last_check')}</span><span>{eq.lastCheck}</span></div>
                    <div className="eq-info-row"><span>{t('equipment.detail_last_maintenance')}</span><span>{eq.lastMaintenance}</span></div>
                    <div className="eq-info-row"><span>{t('equipment.detail_next_maintenance')}</span><span>{eq.nextMaintenance} <span className="eq-text-primary">{t('equipment.in_days').replace('{0}', eq.nextDays)}</span></span></div>
                  </div>
                  {/* Health Score */}
                  <div className="eq-health-score">
                    <span className="eq-health-label">{t('equipment.health_score')}</span>
                    <div className="eq-health-gauge">
                      <svg width="60" height="60" viewBox="0 0 60 60">
                        <circle cx="30" cy="30" r="26" fill="none" stroke="#e2e8f0" strokeWidth="6"/>
                        <circle cx="30" cy="30" r="26" fill="none" stroke="#16a34a" strokeWidth="6"
                          strokeDasharray={`${(eq.healthScore / 100) * 163} 163`}
                          strokeLinecap="round" transform="rotate(-90 30 30)"/>
                        <text x="30" y="35" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">{eq.healthScore}</text>
                      </svg>
                      <span className="eq-health-percent">{eq.healthPercent}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Indicators */}
              <div className="eq-indicators-section">
                <h3>{t('equipment.key_indicators')}</h3>
                <div className="eq-indicators-grid">
                  {eq.indicators.map((ind, idx) => (
                    <div key={idx} className="eq-indicator-card">
                      <span className="eq-indicator-label">{ind.label}</span>
                      <div className="eq-indicator-value">
                        <span className="eq-indicator-num">{ind.value}</span>
                        <span className="eq-indicator-unit">{ind.unit}</span>
                      </div>
                      <span className={`eq-indicator-status ${ind.status === 'Normal' ? 'eq-ind-normal' : 'eq-ind-warning'}`}>{ind.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Interventions */}

            </div>

            {/* Right Sidebar */}
            <div className="eq-overview-sidebar">
              {/* Image */}
              {eq.image ? (
                <div className="eq-detail-image">
                  <img src={eq.image} alt={eq.name} />
                </div>
              ) : (
                <div className="eq-detail-image eq-image-placeholder">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  <span>{t('equipment.no_image')}</span>
                </div>
              )}

              {/* Linked Information */}
              <div className="eq-sidebar-panel">
                <h4>{t('equipment.linked_info')}</h4>
                <div className="eq-linked-items">
                  <div className="eq-linked-item"><span>{t('equipment.detail_interventions')}</span><span>{eq.linkedInfo.interventions}</span></div>
                  <div className="eq-linked-item"><span>{t('equipment.detail_open_alerts')}</span><span>{eq.linkedInfo.openAlerts}</span></div>
                  <div className="eq-linked-item"><span>{t('equipment.detail_spare_parts')}</span><span>{eq.linkedInfo.spareParts}</span></div>
                  <div className="eq-linked-item"><span>{t('equipment.detail_documents')}</span><span>{eq.linkedInfo.documents}</span></div>
                </div>
              </div>
            </div>
          </div>

      </div>
    </div>
  )
}

export default EquipmentDetailPage
