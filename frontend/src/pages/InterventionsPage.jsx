import { useState, useMemo, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { ROLES } from '../config/roles'
import { fetchInterventions, fetchInterventionStats, createIntervention } from '../services/interventionService'
import { fetchEquipment } from '../services/equipmentService'
import { fetchUsers } from '../services/userService'
import '../styles/interventions.css'

const STATUS_CONFIG = {
  planned: { label_fr: 'Planifiée', label_en: 'Planned', class: 'status-assigned' },
  assigned: { label_fr: 'Affectée', label_en: 'Assigned', class: 'status-assigned' },
  in_progress: { label_fr: 'En cours', label_en: 'In Progress', class: 'status-in-progress' },
  closed: { label_fr: 'Clôturée', label_en: 'Closed', class: 'status-closed' },
}

const PRIORITY_CONFIG = {
  Critique: 'priority-critical',
  Haute: 'priority-high',
  Moyenne: 'priority-medium',
  Basse: 'priority-low',
}

// Mapping helpers: backend -> French display
const TYPE_MAP = { corrective: 'Corrective', preventive: 'Préventive' }
const PRIORITY_MAP = { critical: 'Critique', high: 'Haute', medium: 'Moyenne', low: 'Basse' }

// Reverse mappings: French display -> backend value
const TYPE_REVERSE = { Corrective: 'corrective', 'Préventive': 'preventive' }
const PRIORITY_REVERSE = { Critique: 'critical', Haute: 'high', Moyenne: 'medium', Basse: 'low' }

function InterventionsPage() {
  const { t } = useLanguage()
  const { userRole } = useAuth()
  const canManage = userRole === ROLES.MAINTENANCE_MANAGER
  const [interventions, setInterventions] = useState([])
  const [stats, setStats] = useState({ total: 0, planned: 0, assigned: 0, in_progress: 0, closed: 0, pending: 0 })
  const [equipmentList, setEquipmentList] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [detailIntervention, setDetailIntervention] = useState(null)
  const [detailChecklist, setDetailChecklist] = useState([])
  const [detailChecklistStats, setDetailChecklistStats] = useState({ total: 0, completed: 0 })

  const openDetail = async (intervention) => {
    setDetailIntervention(intervention)
    setDetailChecklist([])
    setDetailChecklistStats({ total: 0, completed: 0 })
    // Fetch checklist progress
    try {
      const res = await fetch(`/api/interventions/${intervention.id}/checklist/`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        setDetailChecklist(data.items || [])
        setDetailChecklistStats({ total: data.total_items || 0, completed: data.completed_items || 0 })
      }
    } catch (e) {}
  }

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [interventionsData, statsData, equipmentData, usersData] = await Promise.all([
        fetchInterventions(),
        fetchInterventionStats(),
        fetchEquipment(),
        fetchUsers(),
      ])
      setInterventions(interventionsData)
      setStats(statsData)
      setEquipmentList(equipmentData)
      setTechnicians(usersData)
    } catch (error) {
      console.error('Failed to load interventions data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Map backend intervention to display format
  const mapIntervention = (item) => ({
    id: item.reference,
    equipment: item.equipment_name,
    equipmentRef: item.equipment_reference,
    type: TYPE_MAP[item.intervention_type] || item.intervention_type,
    priority: PRIORITY_MAP[item.priority] || item.priority,
    status: item.status,
    technician: item.technician_name || null,
    description: item.description,
    createdAt: item.created_at ? item.created_at.split('T')[0] : '',
    startedAt: item.started_at ? item.started_at.split('T')[0] : null,
    closedAt: item.closed_at ? item.closed_at.split('T')[0] : null,
  })

  const mappedInterventions = useMemo(() => interventions.map(mapIntervention), [interventions])

  // KPI counts from stats API
  const counts = useMemo(() => ({
    all: stats.total || 0,
    planned: stats.planned || 0,
    assigned: stats.assigned || 0,
    in_progress: stats.in_progress || 0,
    closed: stats.closed || 0,
  }), [stats])

  // Filter
  const filtered = useMemo(() => {
    let data = [...mappedInterventions]
    if (activeTab !== 'all') data = data.filter(i => i.status === activeTab)
    if (search) {
      const s = search.toLowerCase()
      data = data.filter(i => i.id.toLowerCase().includes(s) || i.equipment.toLowerCase().includes(s) || (i.technician || '').toLowerCase().includes(s))
    }
    if (filterType) data = data.filter(i => i.type === filterType)
    if (filterPriority) data = data.filter(i => i.priority === filterPriority)
    return data
  }, [mappedInterventions, activeTab, search, filterType, filterPriority])

  // Create intervention
  const [createForm, setCreateForm] = useState({
    equipment: '', type: 'Corrective', priority: 'Moyenne', technician: '', description: ''
  })
  const [checklistItems, setChecklistItems] = useState([])

  const addChecklistItem = () => {
    setChecklistItems(prev => [...prev, { description: '', is_critical: false }])
  }

  const removeChecklistItem = (index) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateChecklistItem = (index, field, value) => {
    setChecklistItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const handleCreate = async () => {
    try {
      const payload = {
        equipment: parseInt(createForm.equipment, 10),
        intervention_type: TYPE_REVERSE[createForm.type] || createForm.type,
        priority: PRIORITY_REVERSE[createForm.priority] || createForm.priority,
        technician: createForm.technician ? parseInt(createForm.technician, 10) : null,
        description: createForm.description,
      }
      const createdIntervention = await createIntervention(payload)

      // If checklist items were added, create the checklist linked to THIS intervention
      if (checklistItems.length > 0 && checklistItems.some(item => item.description.trim())) {
        const validItems = checklistItems.filter(item => item.description.trim())
        try {
          const csrfMatch = document.cookie.match(/csrftoken=([^;]+)/)
          const csrfToken = csrfMatch ? csrfMatch[1] : null
          await fetch('/api/interventions/checklists/', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
            },
            body: JSON.stringify({
              name: `Checklist – ${createForm.description.slice(0, 50)}`,
              intervention: createdIntervention.id,
              intervention_type: TYPE_REVERSE[createForm.type] || 'both',
              estimated_duration_minutes: 60,
              items: validItems.map((item, i) => ({
                description: item.description,
                is_critical: item.is_critical,
                order: i + 1,
              })),
            }),
          })
        } catch (e) {
          // Don't block if checklist creation fails
        }
      }

      setShowCreateModal(false)
      setCreateForm({ equipment: '', type: 'Corrective', priority: 'Moyenne', technician: '', description: '' })
      setChecklistItems([])
      // Refresh data
      await loadData()
    } catch (error) {
      console.error('Failed to create intervention:', error)
      alert('Erreur: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="page-heading-row">
          <h1>{t('interventions.title')}</h1>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
          <span>Chargement...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="page-heading-row">
        <h1>{t('interventions.title')}</h1>
        {canManage && (
        <button className="eq-add-button" onClick={() => setShowCreateModal(true)}>
          + {t('interventions.create')}
        </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="eq-kpi-row">
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('interventions.kpi_total')}</span>
            <span className="eq-kpi-value">{counts.all}</span>
          </div>
        </div>
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('interventions.kpi_in_progress')}</span>
            <span className="eq-kpi-value">{counts.in_progress}</span>
          </div>
        </div>
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('interventions.kpi_closed')}</span>
            <span className="eq-kpi-value">{counts.closed}</span>
          </div>
        </div>
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('interventions.kpi_pending')}</span>
            <span className="eq-kpi-value">{(stats.pending || 0)}</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="eq-toolbar">
        <div className="eq-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder={t('interventions.search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="eq-filters">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">{t('interventions.filter_all_types')}</option>
            <option value="Corrective">{t('interventions.type_corrective')}</option>
            <option value="Préventive">{t('interventions.type_preventive')}</option>
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">{t('interventions.filter_all_priorities')}</option>
            <option value="Critique">Critique</option>
            <option value="Haute">Haute</option>
            <option value="Moyenne">Moyenne</option>
            <option value="Basse">Basse</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="eq-tabs">
        <button className={`eq-tab ${activeTab === 'all' ? 'eq-tab-active' : ''}`} onClick={() => setActiveTab('all')}>
          {t('interventions.tab_all')} ({counts.all})
        </button>
        <button className={`eq-tab eq-tab-orange ${activeTab === 'planned' ? 'eq-tab-active' : ''}`} onClick={() => setActiveTab('planned')}>
          {t('interventions.tab_planned')} ({counts.planned})
        </button>
        <button className={`eq-tab eq-tab-green ${activeTab === 'assigned' ? 'eq-tab-active' : ''}`} onClick={() => setActiveTab('assigned')}>
          {t('interventions.tab_assigned')} ({counts.assigned})
        </button>
        <button className={`eq-tab ${activeTab === 'in_progress' ? 'eq-tab-active' : ''}`} onClick={() => setActiveTab('in_progress')}>
          {t('interventions.tab_in_progress')} ({counts.in_progress})
        </button>
        <button className={`eq-tab ${activeTab === 'closed' ? 'eq-tab-active' : ''}`} onClick={() => setActiveTab('closed')}>
          {t('interventions.tab_closed')} ({counts.closed})
        </button>
      </div>

      {/* Table */}
      <div className="eq-table-panel">
        <div className="table-wrapper">
          <table className="data-table eq-table">
            <thead>
              <tr>
                <th>{t('interventions.col_id')}</th>
                <th>{t('interventions.col_equipment')}</th>
                <th>{t('interventions.col_type')}</th>
                <th>{t('interventions.col_priority')}</th>
                <th>{t('interventions.col_technician')}</th>
                <th>{t('interventions.col_status')}</th>
                <th>{t('interventions.col_date')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(int => (
                <tr key={int.id}>
                  <td className="eq-id-cell" style={{ color: 'var(--primary)', fontWeight: 700 }}>{int.id}</td>
                  <td>
                    <div className="eq-name-cell">
                      <span className="eq-name">{int.equipment}</span>
                      <span className="eq-model">{int.equipmentRef}</span>
                    </div>
                  </td>
                  <td><span className={`eq-type-badge ${int.type === 'Préventive' ? 'eq-type-preventive' : 'eq-type-corrective'}`}>{int.type}</span></td>
                  <td><span className={`priority-badge ${PRIORITY_CONFIG[int.priority] || ''}`}>{int.priority}</span></td>
                  <td>{int.technician || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                  <td><span className={`status-badge-sm ${STATUS_CONFIG[int.status]?.class || ''}`}>{STATUS_CONFIG[int.status]?.label_fr || int.status}</span></td>
                  <td>{int.createdAt}</td>
                  <td>
                    <button className="eq-action-btn" onClick={() => openDetail(int)} title={t('interventions.view_detail')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="7" className="eq-empty">{t('interventions.no_results')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal (checklist view for resp. maintenance) */}
      {detailIntervention && (
        <div className="modal-backdrop" onClick={() => setDetailIntervention(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90vw' }}>
            <div className="modal-header">
              <h3>{detailIntervention.id}</h3>
              <button className="icon-button" onClick={() => setDetailIntervention(null)}>X</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="detail-row"><span className="detail-label">{t('interventions.col_equipment')}</span><span className="detail-value">{detailIntervention.equipment}</span></div>
              <div className="detail-row"><span className="detail-label">{t('interventions.col_type')}</span><span className="detail-value">{detailIntervention.type}</span></div>
              <div className="detail-row"><span className="detail-label">{t('interventions.col_priority')}</span><span className={`priority-badge ${PRIORITY_CONFIG[detailIntervention.priority] || ''}`}>{detailIntervention.priority}</span></div>
              <div className="detail-row"><span className="detail-label">{t('interventions.col_technician')}</span><span className="detail-value">{detailIntervention.technician || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">{t('interventions.col_status')}</span><span className={`status-badge-sm ${STATUS_CONFIG[detailIntervention.status]?.class || ''}`}>{STATUS_CONFIG[detailIntervention.status]?.label_fr || detailIntervention.status}</span></div>
              <div className="detail-row"><span className="detail-label">{t('interventions.form_description')}</span><span className="detail-value">{detailIntervention.description || '—'}</span></div>

              {/* Checklist Progress */}
              {detailChecklist.length > 0 && (
                <div className="checklist-section">
                  <h4>{t('interventions.checklist_progress')} ({detailChecklistStats.completed}/{detailChecklistStats.total})</h4>
                  <div className="checklist-items">
                    {detailChecklist.map(item => (
                      <div key={item.id} className={`checklist-item ${item.is_completed ? 'checklist-done' : ''} ${item.item_is_critical ? 'checklist-critical' : ''}`}>
                        <input type="checkbox" checked={item.is_completed} disabled />
                        <span className="checklist-item-text">{item.item_description}</span>
                        {item.item_is_critical && <span className="checklist-critical-badge">{t('interventions.form_critical')}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setDetailIntervention(null)}>{t('interventions.form_cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Intervention Modal */}
      {showCreateModal && (
        <>
          <div className="eq-panel-backdrop" onClick={() => setShowCreateModal(false)}></div>
          <div className="eq-form-panel">
            <div className="eq-form-panel-header">
              <h2>{t('interventions.create_title')}</h2>
              <button className="eq-panel-close" onClick={() => setShowCreateModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="eq-form-panel-body">
              <div className="eq-field">
                <label>{t('interventions.form_equipment')} *</label>
                <select className="eq-input" value={createForm.equipment} onChange={(e) => setCreateForm(f => ({ ...f, equipment: e.target.value }))}>
                  <option value="">{t('interventions.form_select_equipment')}</option>
                  {equipmentList.map(eq => <option key={eq.id} value={eq.id}>{eq.reference} – {eq.name}</option>)}
                </select>
              </div>
              <div className="eq-field">
                <label>{t('interventions.form_type')} *</label>
                <select className="eq-input" value={createForm.type} onChange={(e) => setCreateForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="Corrective">{t('interventions.type_corrective')}</option>
                  <option value="Préventive">{t('interventions.type_preventive')}</option>
                </select>
              </div>
              <div className="eq-field">
                <label>{t('interventions.form_priority')} *</label>
                <select className="eq-input" value={createForm.priority} onChange={(e) => setCreateForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="Critique">Critique</option>
                  <option value="Haute">Haute</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Basse">Basse</option>
                </select>
              </div>
              <div className="eq-field">
                <label>{t('interventions.form_technician')}</label>
                <select className="eq-input" value={createForm.technician} onChange={(e) => setCreateForm(f => ({ ...f, technician: e.target.value }))}>
                  <option value="">{t('interventions.form_select_technician')}</option>
                  {technicians.map(tech => <option key={tech.id} value={tech.id}>{tech.first_name} {tech.last_name}</option>)}
                </select>
              </div>
              <div className="eq-field">
                <label>{t('interventions.form_description')} *</label>
                <textarea className="eq-input eq-textarea" rows={4} placeholder={t('interventions.form_description_placeholder')} value={createForm.description} onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}></textarea>
              </div>

              {/* Checklist */}
              <div className="eq-field">
                <label>{t('interventions.form_checklist')}</label>
                <div className="checklist-builder">
                  {checklistItems.map((item, index) => (
                    <div key={index} className="checklist-builder-item">
                      <input
                        type="text"
                        className="eq-input"
                        placeholder={`${t('interventions.form_step')} ${index + 1}`}
                        value={item.description}
                        onChange={(e) => updateChecklistItem(index, 'description', e.target.value)}
                      />
                      <label className="checklist-critical-toggle">
                        <input
                          type="checkbox"
                          checked={item.is_critical}
                          onChange={(e) => updateChecklistItem(index, 'is_critical', e.target.checked)}
                        />
                        <span>{t('interventions.form_critical')}</span>
                      </label>
                      <button type="button" className="checklist-remove-btn" onClick={() => removeChecklistItem(index)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" className="checklist-add-btn" onClick={addChecklistItem}>
                    + {t('interventions.form_add_step')}
                  </button>
                </div>
              </div>
            </div>
            <div className="eq-form-panel-footer">
              <button className="eq-btn-cancel" onClick={() => setShowCreateModal(false)}>{t('interventions.form_cancel')}</button>
              <button className="eq-btn-save" onClick={handleCreate} disabled={!createForm.equipment || !createForm.description}>{t('interventions.form_create')}</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default InterventionsPage
