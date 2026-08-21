import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { fetchMyInterventions, startIntervention, closeIntervention } from '../services/interventionService'
import '../styles/interventions.css'

const STATUS_LABELS = {
  planned: { fr: 'Planifiée', en: 'Planned', className: 'status-assigned' },
  assigned: { fr: 'Affectée', en: 'Assigned', className: 'status-assigned' },
  in_progress: { fr: 'En cours', en: 'In Progress', className: 'status-in-progress' },
  suspended: { fr: 'Suspendue', en: 'Suspended', className: 'status-suspended' },
  closed: { fr: 'Clôturée', en: 'Closed', className: 'status-closed' },
}

const PRIORITY_MAP = {
  critical: { label: 'Critique', className: 'priority-critical' },
  high: { label: 'Haute', className: 'priority-high' },
  medium: { label: 'Moyenne', className: 'priority-medium' },
  low: { label: 'Basse', className: 'priority-low' },
}

const TYPE_MAP = {
  corrective: 'Corrective',
  preventive: 'Préventive',
}

function MyInterventionsPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedIntervention, setSelectedIntervention] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [checklistItems, setChecklistItems] = useState([])
  const [checklistStats, setChecklistStats] = useState({total: 0, completed: 0})

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchMyInterventions()
      setInterventions(data)
    } catch (err) {
      console.error('Failed to load interventions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedIntervention) {
      fetch(`/api/interventions/${selectedIntervention.reference}/checklist/`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      })
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(data => {
          setChecklistItems(data.items || [])
          setChecklistStats({ total: data.total_items || 0, completed: data.completed_items || 0 })
        })
        .catch(() => {
          setChecklistItems([])
          setChecklistStats({ total: 0, completed: 0 })
        })
    } else {
      setChecklistItems([])
      setChecklistStats({ total: 0, completed: 0 })
    }
  }, [selectedIntervention])

  const handleToggleItem = async (item) => {
    const csrfMatch = document.cookie.match(/csrftoken=([^;]+)/)
    const csrfToken = csrfMatch ? csrfMatch[1] : null
    try {
      const res = await fetch(`/api/interventions/${selectedIntervention.reference}/checklist/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
        body: JSON.stringify({ item_id: item.item, is_completed: !item.is_completed }),
      })
      if (res.ok) {
        setChecklistItems(prev =>
          prev.map(ci => ci.id === item.id ? { ...ci, is_completed: !ci.is_completed } : ci)
        )
        setChecklistStats(prev => ({
          ...prev,
          completed: item.is_completed ? prev.completed - 1 : prev.completed + 1,
        }))
      }
    } catch (err) {
      console.error('Failed to toggle checklist item:', err)
    }
  }

  const filtered = filter === 'all'
    ? interventions
    : interventions.filter((i) => i.status === filter)

  const handleStart = async (reference) => {
    try {
      setActionLoading(true)
      await startIntervention(reference)
      await loadData()
      setSelectedIntervention(null)
    } catch (err) {
      console.error('Failed to start intervention:', err)
      alert('Erreur: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleClose = async (reference) => {
    try {
      setActionLoading(true)
      await closeIntervention(reference, 'Intervention terminée.')
      await loadData()
      setSelectedIntervention(null)
    } catch (err) {
      console.error('Failed to close intervention:', err)
      alert('Erreur: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const lang = document.documentElement.lang === 'en' ? 'en' : 'fr'

  if (loading) {
    return (
      <div className="admin-page">
        <h1>{t('technician.my_interventions')}</h1>
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Chargement...</div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="page-heading-row">
        <div>
          <h1>{t('technician.my_interventions')}</h1>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="interventions-tabs">
        {['all', 'assigned', 'in_progress', 'closed'].map((f) => (
          <button
            key={f}
            className={`tab-button ${filter === f ? 'tab-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? t('technician.filter_all') : (STATUS_LABELS[f]?.[lang] || f)}
            <span className="tab-count">
              {f === 'all' ? interventions.length : interventions.filter((i) => i.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Intervention cards */}
      <div className="interventions-grid">
        {filtered.map((intervention) => {
          const priorityConf = PRIORITY_MAP[intervention.priority] || { label: intervention.priority, className: '' }
          const typeLabel = TYPE_MAP[intervention.intervention_type] || intervention.intervention_type

          return (
            <div key={intervention.id} className="intervention-card" onClick={() => setSelectedIntervention(intervention)}>
              <div className="intervention-card-header">
                <span className="intervention-ref">{intervention.reference}</span>
                <span className={`priority-badge ${priorityConf.className}`}>
                  {priorityConf.label}
                </span>
              </div>
              <h4 className="intervention-equipment">{intervention.equipment_name}</h4>
              <p className="intervention-location">{intervention.equipment_reference}</p>
              <p className="intervention-desc">{intervention.description}</p>
              <div className="intervention-card-footer">
                <span className={`status-badge-sm ${STATUS_LABELS[intervention.status]?.className || ''}`}>
                  {STATUS_LABELS[intervention.status]?.[lang] || intervention.status}
                </span>
                <span className="intervention-type">{typeLabel}</span>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="empty-state">{t('technician.no_interventions')}</div>
        )}
      </div>

      {/* Intervention Detail Modal */}
      {selectedIntervention && (
        <div className="modal-backdrop" onClick={() => setSelectedIntervention(null)}>
          <div className="modal-card intervention-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedIntervention.reference}</h3>
              <button className="icon-button" onClick={() => setSelectedIntervention(null)}>X</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">{t('technician.equipment')}</span>
                <span className="detail-value">{selectedIntervention.equipment_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{t('technician.priority')}</span>
                <span className={`priority-badge ${PRIORITY_MAP[selectedIntervention.priority]?.className || ''}`}>
                  {PRIORITY_MAP[selectedIntervention.priority]?.label || selectedIntervention.priority}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{t('technician.type')}</span>
                <span className="detail-value">{TYPE_MAP[selectedIntervention.intervention_type] || selectedIntervention.intervention_type}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{t('technician.status')}</span>
                <span className={`status-badge-sm ${STATUS_LABELS[selectedIntervention.status]?.className || ''}`}>
                  {STATUS_LABELS[selectedIntervention.status]?.[lang] || selectedIntervention.status}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{t('technician.description')}</span>
                <span className="detail-value">{selectedIntervention.description}</span>
              </div>
              {selectedIntervention.started_at && (
                <div className="detail-row">
                  <span className="detail-label">{t('technician.started_at')}</span>
                  <span className="detail-value">{new Date(selectedIntervention.started_at).toLocaleString()}</span>
                </div>
              )}
              {selectedIntervention.closed_at && (
                <div className="detail-row">
                  <span className="detail-label">{t('technician.closed_at')}</span>
                  <span className="detail-value">{new Date(selectedIntervention.closed_at).toLocaleString()}</span>
                </div>
              )}
              {checklistItems.length > 0 && selectedIntervention.status === 'in_progress' && (
                <div className="checklist-section">
                  <h4>{t('technician.checklist_title')} ({checklistStats.completed}/{checklistStats.total})</h4>
                  <div className="checklist-items">
                    {checklistItems.map(item => (
                      <label key={item.id} className={`checklist-item ${item.is_completed ? 'checklist-done' : ''} ${item.item_is_critical ? 'checklist-critical' : ''}`}>
                        <input type="checkbox" checked={item.is_completed} onChange={() => handleToggleItem(item)} disabled={selectedIntervention.status === 'closed'} />
                        <span className="checklist-item-text">{item.item_description}</span>
                        {item.item_is_critical && <span className="checklist-critical-badge">{t('technician.critical_step')}</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions">
              {(selectedIntervention.status === 'assigned' || selectedIntervention.status === 'planned') && (
                <button className="primary-button" onClick={() => handleStart(selectedIntervention.reference)} disabled={actionLoading}>
                  {t('technician.start_intervention')}
                </button>
              )}
              {selectedIntervention.status === 'in_progress' && (
                <button className="primary-button btn-success" onClick={() => handleClose(selectedIntervention.reference)} disabled={actionLoading}>
                  {t('technician.close_intervention')}
                </button>
              )}
              <button className="cancel-button" onClick={() => setSelectedIntervention(null)}>
                {t('technician.close_modal')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyInterventionsPage
