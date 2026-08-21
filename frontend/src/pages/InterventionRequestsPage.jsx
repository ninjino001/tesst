import { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { ROLES } from '../config/roles'
import { fetchEquipment } from '../services/equipmentService'
import '../styles/interventions.css'

const API_BASE = '/api/interventions/requests'

function getCsrfToken() {
  const match = document.cookie.match(/csrftoken=([^;]+)/)
  return match ? match[1] : null
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function InterventionRequestsPage() {
  const { t } = useLanguage()
  const { userRole } = useAuth()
  const canManage = userRole === ROLES.MAINTENANCE_MANAGER

  const [requests, setRequests] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [equipmentList, setEquipmentList] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    equipment: '',
    priority: 'medium',
    location: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [requestsRes, statsRes, equipmentData] = await Promise.all([
        fetch(`${API_BASE}/`, { credentials: 'include' }).then(r => {
          if (!r.ok) throw new Error('Failed to fetch requests')
          return r.json()
        }),
        fetch(`${API_BASE}/stats/`, { credentials: 'include' }).then(r => {
          if (!r.ok) throw new Error('Failed to fetch stats')
          return r.json()
        }),
        fetchEquipment(),
      ])
      setRequests(requestsRes)
      setStats(statsRes)
      setEquipmentList(equipmentData)
    } catch (error) {
      console.error('Failed to load requests data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let data = [...requests]
    if (activeTab === 'pending') data = data.filter(r => r.status === 'pending')
    else if (activeTab === 'approved') data = data.filter(r => r.status === 'approved')
    else if (activeTab === 'rejected') data = data.filter(r => r.status === 'rejected')
    return data
  }, [requests, activeTab])

  const handleCreate = async () => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }
      const csrfToken = getCsrfToken()
      if (csrfToken) headers['X-CSRFToken'] = csrfToken

      const payload = {
        title: createForm.title,
        description: createForm.description,
        equipment: parseInt(createForm.equipment, 10),
        priority: createForm.priority,
        location: createForm.location,
      }

      const res = await fetch(`${API_BASE}/`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.text()
        let error = 'Failed to create request'
        try {
          const json = JSON.parse(body)
          error = json.detail || json.error || error
        } catch (e) { /* keep default */ }
        throw new Error(error)
      }

      setShowCreateModal(false)
      setCreateForm({ title: '', description: '', equipment: '', priority: 'medium', location: '' })
      await loadData()
    } catch (error) {
      console.error('Failed to create request:', error)
      alert(error.message)
    }
  }

  const handleApprove = async (id) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }
      const csrfToken = getCsrfToken()
      if (csrfToken) headers['X-CSRFToken'] = csrfToken

      const res = await fetch(`${API_BASE}/${id}/approve/`, {
        method: 'POST',
        credentials: 'include',
        headers,
      })

      if (!res.ok) throw new Error('Failed to approve request')
      await loadData()
    } catch (error) {
      console.error('Failed to approve request:', error)
      alert(error.message)
    }
  }

  const handleReject = async (id) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }
      const csrfToken = getCsrfToken()
      if (csrfToken) headers['X-CSRFToken'] = csrfToken

      const res = await fetch(`${API_BASE}/${id}/reject/`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ reason: rejectReason }),
      })

      if (!res.ok) throw new Error('Failed to reject request')
      setRejectingId(null)
      setRejectReason('')
      await loadData()
    } catch (error) {
      console.error('Failed to reject request:', error)
      alert(error.message)
    }
  }

  const openDetail = (request) => {
    setSelectedRequest(request)
    setShowDetailModal(true)
  }

  const getPriorityLabel = (priority) => {
    const map = {
      low: t('equipment.crit_low'),
      medium: t('equipment.crit_medium'),
      high: t('equipment.crit_high'),
      critical: t('equipment.crit_critical'),
    }
    return map[priority] || priority
  }

  const getPriorityClass = (priority) => {
    const map = {
      low: 'priority-low',
      medium: 'priority-medium',
      high: 'priority-high',
      critical: 'priority-critical',
    }
    return map[priority] || ''
  }

  const getStatusLabel = (status) => {
    const map = {
      pending: t('requests.status_pending'),
      approved: t('requests.status_approved'),
      rejected: t('requests.status_rejected'),
    }
    return map[status] || status
  }

  const getStatusClass = (status) => {
    const map = {
      pending: 'status-assigned',
      approved: 'eq-status-operational',
      rejected: 'eq-status-out',
    }
    return map[status] || ''
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="page-heading-row">
          <h1>{t('requests.title')}</h1>
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
        <h1>{t('requests.title')}</h1>
        <button className="eq-add-button" onClick={() => setShowCreateModal(true)}>
          + {t('requests.create')}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="eq-kpi-row">
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('requests.kpi_total')}</span>
            <span className="eq-kpi-value">{stats.total}</span>
          </div>
        </div>
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('requests.kpi_pending')}</span>
            <span className="eq-kpi-value">{stats.pending}</span>
          </div>
        </div>
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('requests.kpi_approved')}</span>
            <span className="eq-kpi-value">{stats.approved}</span>
          </div>
        </div>
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('requests.kpi_rejected')}</span>
            <span className="eq-kpi-value">{stats.rejected}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="eq-tabs">
        <button className={`eq-tab ${activeTab === 'all' ? 'eq-tab-active' : ''}`} onClick={() => setActiveTab('all')}>
          {t('requests.tab_all')} ({stats.total})
        </button>
        <button className={`eq-tab eq-tab-orange ${activeTab === 'pending' ? 'eq-tab-active' : ''}`} onClick={() => setActiveTab('pending')}>
          {t('requests.tab_pending')} ({stats.pending})
        </button>
        <button className={`eq-tab eq-tab-green ${activeTab === 'approved' ? 'eq-tab-active' : ''}`} onClick={() => setActiveTab('approved')}>
          {t('requests.tab_approved')} ({stats.approved})
        </button>
        <button className={`eq-tab eq-tab-red ${activeTab === 'rejected' ? 'eq-tab-active' : ''}`} onClick={() => setActiveTab('rejected')}>
          {t('requests.tab_rejected')} ({stats.rejected})
        </button>
      </div>

      {/* Table */}
      <div className="eq-table-panel">
        <div className="table-wrapper">
          <table className="data-table eq-table">
            <thead>
              <tr>
                <th>{t('requests.col_reference')}</th>
                <th>{t('requests.col_title')}</th>
                <th>{t('requests.col_equipment')}</th>
                <th>{t('requests.col_priority')}</th>
                <th>{t('requests.col_status')}</th>
                <th>{t('requests.col_submitted_by')}</th>
                <th>{t('requests.col_date')}</th>
                <th>{t('requests.col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(req => (
                <tr key={req.id}>
                  <td className="eq-id-cell" style={{ color: 'var(--primary)', fontWeight: 700 }}>{req.reference}</td>
                  <td>{req.title}</td>
                  <td>
                    <div className="eq-name-cell">
                      <span className="eq-name">{req.equipment_name}</span>
                      <span className="eq-model">{req.equipment_reference}</span>
                    </div>
                  </td>
                  <td><span className={`priority-badge ${getPriorityClass(req.priority)}`}>{getPriorityLabel(req.priority)}</span></td>
                  <td><span className={`status-badge-sm ${getStatusClass(req.status)}`}>{getStatusLabel(req.status)}</span></td>
                  <td>{req.submitted_by_name}</td>
                  <td>{formatDate(req.submitted_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      {/* View detail */}
                      <button
                        className="eq-action-btn"
                        title="Details"
                        onClick={() => openDetail(req)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>

                      {/* Approve / Reject buttons for Resp. maintenance when pending */}
                      {req.status === 'pending' && canManage && (
                        <>
                          <button
                            className="eq-action-btn"
                            title={t('requests.approve_btn')}
                            onClick={() => handleApprove(req.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#22c55e' }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </button>
                          {rejectingId === req.id ? (
                            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                              <input
                                type="text"
                                className="eq-input"
                                placeholder={t('requests.reject_reason_placeholder')}
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                style={{ fontSize: '0.8rem', padding: '0.2rem 0.4rem', width: '140px' }}
                              />
                              <button
                                className="eq-action-btn"
                                onClick={() => handleReject(req.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#ef4444' }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              </button>
                              <button
                                className="eq-action-btn"
                                onClick={() => { setRejectingId(null); setRejectReason('') }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#6b7280' }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="18" y1="6" x2="6" y2="18"/>
                                  <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              className="eq-action-btn"
                              title={t('requests.reject_btn')}
                              onClick={() => setRejectingId(req.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#ef4444' }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="15" y1="9" x2="9" y2="15"/>
                                <line x1="9" y1="9" x2="15" y2="15"/>
                              </svg>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="8" className="eq-empty">{t('requests.no_results')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Request Modal */}
      {showCreateModal && (
        <>
          <div className="eq-panel-backdrop" onClick={() => setShowCreateModal(false)}></div>
          <div className="eq-form-panel">
            <div className="eq-form-panel-header">
              <h2>{t('requests.create')}</h2>
              <button className="eq-panel-close" onClick={() => setShowCreateModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="eq-form-panel-body">
              <div className="eq-field">
                <label>{t('requests.form_title')} *</label>
                <input
                  type="text"
                  className="eq-input"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="eq-field">
                <label>{t('requests.form_description')} *</label>
                <textarea
                  className="eq-input eq-textarea"
                  rows={4}
                  value={createForm.description}
                  onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                ></textarea>
              </div>
              <div className="eq-field">
                <label>{t('requests.form_equipment')} *</label>
                <select
                  className="eq-input"
                  value={createForm.equipment}
                  onChange={(e) => setCreateForm(f => ({ ...f, equipment: e.target.value }))}
                >
                  <option value="">--</option>
                  {equipmentList.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.reference} - {eq.name}</option>
                  ))}
                </select>
              </div>
              <div className="eq-field">
                <label>{t('requests.form_priority')} *</label>
                <select
                  className="eq-input"
                  value={createForm.priority}
                  onChange={(e) => setCreateForm(f => ({ ...f, priority: e.target.value }))}
                >
                  <option value="low">{t('equipment.crit_low')}</option>
                  <option value="medium">{t('equipment.crit_medium')}</option>
                  <option value="high">{t('equipment.crit_high')}</option>
                  <option value="critical">{t('equipment.crit_critical')}</option>
                </select>
              </div>
              <div className="eq-field">
                <label>{t('requests.form_location')}</label>
                <input
                  type="text"
                  className="eq-input"
                  value={createForm.location}
                  onChange={(e) => setCreateForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
            </div>
            <div className="eq-form-panel-footer">
              <button className="eq-btn-cancel" onClick={() => setShowCreateModal(false)}>
                {t('requests.form_cancel')}
              </button>
              <button
                className="eq-btn-save"
                onClick={handleCreate}
                disabled={!createForm.title || !createForm.description || !createForm.equipment}
              >
                {t('requests.form_submit')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <>
          <div className="eq-panel-backdrop" onClick={() => setShowDetailModal(false)}></div>
          <div className="eq-form-panel">
            <div className="eq-form-panel-header">
              <h2>{selectedRequest.reference}</h2>
              <button className="eq-panel-close" onClick={() => setShowDetailModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="eq-form-panel-body">
              <div className="eq-field">
                <label>{t('requests.col_title')}</label>
                <p>{selectedRequest.title}</p>
              </div>
              <div className="eq-field">
                <label>{t('requests.form_description')}</label>
                <p>{selectedRequest.description}</p>
              </div>
              <div className="eq-field">
                <label>{t('requests.col_equipment')}</label>
                <p>{selectedRequest.equipment_name} ({selectedRequest.equipment_reference})</p>
              </div>
              <div className="eq-field">
                <label>{t('requests.col_priority')}</label>
                <span className={`priority-badge ${getPriorityClass(selectedRequest.priority)}`}>
                  {getPriorityLabel(selectedRequest.priority)}
                </span>
              </div>
              <div className="eq-field">
                <label>{t('requests.col_status')}</label>
                <span className={`status-badge-sm ${getStatusClass(selectedRequest.status)}`}>
                  {getStatusLabel(selectedRequest.status)}
                </span>
              </div>
              <div className="eq-field">
                <label>{t('requests.form_location')}</label>
                <p>{selectedRequest.location || '—'}</p>
              </div>
              <div className="eq-field">
                <label>{t('requests.col_submitted_by')}</label>
                <p>{selectedRequest.submitted_by_name}</p>
              </div>
              <div className="eq-field">
                <label>{t('requests.col_date')}</label>
                <p>{formatDate(selectedRequest.submitted_at)}</p>
              </div>
              {selectedRequest.reviewed_at && (
                <div className="eq-field">
                  <label>Reviewed</label>
                  <p>{formatDate(selectedRequest.reviewed_at)}</p>
                </div>
              )}
              {selectedRequest.rejection_reason && (
                <div className="eq-field">
                  <label>{t('requests.reject_btn')}</label>
                  <p style={{ color: '#ef4444' }}>{selectedRequest.rejection_reason}</p>
                </div>
              )}
            </div>
            <div className="eq-form-panel-footer">
              <button className="eq-btn-cancel" onClick={() => setShowDetailModal(false)}>
                {t('requests.form_cancel')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default InterventionRequestsPage
