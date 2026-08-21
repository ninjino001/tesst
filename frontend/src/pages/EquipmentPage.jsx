import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { ROLES } from '../config/roles'
import EquipmentFormPanel from './EquipmentFormPanel'
import { fetchEquipment, fetchEquipmentStats, fetchCategories, createEquipment, updateEquipment } from '../services/equipmentService'
import '../styles/equipment.css'

const PAGE_SIZE_OPTIONS = [10, 25, 50]

// Transform backend equipment object to the UI format
function mapEquipment(item) {
  return {
    id: item.reference,
    name: item.name,
    model: item.model || '',
    category: item.category_name || '',
    location: item.location || '',
    status: item.status || '',
    criticality: item.criticality || '',
    lastMaintenance: item.last_maintenance || '—',
    nextMaintenance: item.next_maintenance || '—',
    nextDays: item.days_until_maintenance,
    image: item.image,
    sensorCount: item.sensor_count,
  }
}

function EquipmentPage() {
  const { t } = useLanguage()
  const { userRole } = useAuth()
  const navigate = useNavigate()

  const canEdit = userRole === ROLES.ADMIN || userRole === ROLES.MAINTENANCE_MANAGER

  const getStatusLabel = (status) => {
    const map = { operational: t('equipment.status_operational'), under_maintenance: t('equipment.status_maintenance'), out_of_service: t('equipment.status_out') }
    return map[status] || status
  }

  const getCriticalityLabel = (crit) => {
    const map = { low: t('equipment.crit_low'), medium: t('equipment.crit_medium'), high: t('equipment.crit_high'), critical: t('equipment.crit_critical') }
    return map[crit] || crit
  }

  const [equipment, setEquipment] = useState([])
  const [categories, setCategories] = useState([])
  const [stats, setStats] = useState({ total: 0, operational: 0, under_maintenance: 0, out_of_service: 0, due_maintenance: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCriticality, setFilterCriticality] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showForm, setShowForm] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState(null)

  // Load data on mount
  const loadData = async () => {
    setLoading(true)
    try {
      const [eqData, statsData] = await Promise.all([
        fetchEquipment(),
        fetchEquipmentStats(),
      ])
      setEquipment(eqData.map(mapEquipment))
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load equipment data:', error)
    }
    try {
      const catData = await fetchCategories()
      const catNames = catData.map(c => c.name)
      setCategories(catNames.length > 0 ? catNames : ['HVAC', 'Power', 'Baggage Handling', 'Vertical Transport', 'Security', 'Passenger Boarding', 'Doors'])
    } catch (error) {
      setCategories(['HVAC', 'Power', 'Baggage Handling', 'Vertical Transport', 'Security', 'Passenger Boarding', 'Doors'])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Counts from stats API
  const counts = useMemo(() => ({
    all: stats.total || 0,
    operational: stats.operational || 0,
    maintenance: stats.under_maintenance || 0,
    outOfService: stats.out_of_service || 0,
    dueMaintenance: stats.due_maintenance || 0,
  }), [stats])

  // Filtered data
  const filtered = useMemo(() => {
    let data = [...equipment]
    if (activeTab === 'operational') data = data.filter(e => e.status === 'operational')
    else if (activeTab === 'maintenance') data = data.filter(e => e.status === 'under_maintenance')
    else if (activeTab === 'outOfService') data = data.filter(e => e.status === 'out_of_service')
    else if (activeTab === 'dueMaintenance') data = data.filter(e => e.nextDays !== null && e.nextDays !== undefined && e.nextDays <= 0)

    if (search) {
      const s = search.toLowerCase()
      data = data.filter(e => e.id.toLowerCase().includes(s) || e.name.toLowerCase().includes(s) || e.model.toLowerCase().includes(s))
    }
    if (filterCategory) data = data.filter(e => e.category === filterCategory)
    if (filterStatus) data = data.filter(e => e.status === filterStatus)
    if (filterCriticality) data = data.filter(e => e.criticality === filterCriticality)

    return data
  }, [equipment, search, filterCategory, filterStatus, filterCriticality, activeTab])

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleAdd = () => { setEditingEquipment(null); setShowForm(true) }
  const handleEdit = (eq) => { setEditingEquipment(eq); setShowForm(true) }
  const handleView = (eq) => { navigate(`/app/equipment/${eq.id}`) }

  const handleFormSubmit = async (formData) => {
    try {
      const payload = {
        name: formData.name,
        model: formData.model || '',
        category_input: formData.category === '__other__' ? (formData.customCategory || '') : (formData.category || ''),
        location: formData.location || '',
        status: formData.status || 'operational',
        criticality: formData.criticality || 'medium',
        installation_date: formData.installationDate || null,
        description: formData.description || '',
      }

      if (editingEquipment) {
        await updateEquipment(editingEquipment.id, payload)
      } else {
        await createEquipment(payload)
      }
      setShowForm(false)
      await loadData()
    } catch (error) {
      console.error('Failed to save equipment:', error)
      alert('Erreur: ' + error.message)
    }
  }

  const getStatusClass = (status) => {
    if (status === 'operational') return 'eq-status-operational'
    if (status === 'under_maintenance') return 'eq-status-maintenance'
    return 'eq-status-out'
  }

  const getCriticalityClass = (crit) => {
    if (crit === 'critical') return 'eq-crit-critical'
    if (crit === 'high') return 'eq-crit-high'
    if (crit === 'medium') return 'eq-crit-medium'
    return 'eq-crit-low'
  }

  if (loading) {
    return (
      <div className="equipment-page">
        <div className="eq-loading">
          <div className="eq-loading-spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="equipment-page">
      {/* Header */}
      <div className="eq-header">
        <div>
          <h1>{t('equipment.title')}</h1>
          <p className="eq-subtitle">{t('equipment.subtitle')}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="eq-kpi-row">
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-8v4h8V3z"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('equipment.kpi_total')}</span>
            <span className="eq-kpi-value">{counts.all}</span>
            <span className="eq-kpi-meta">{t('equipment.kpi_total_sub')}</span>
          </div>
        </div>
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('equipment.kpi_operational')}</span>
            <span className="eq-kpi-value">{counts.operational}</span>
            <span className="eq-kpi-meta">{counts.all > 0 ? ((counts.operational / counts.all) * 100).toFixed(1) : '0.0'}% {t('equipment.kpi_of_total')}</span>
          </div>
        </div>
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('equipment.kpi_maintenance')}</span>
            <span className="eq-kpi-value">{counts.maintenance}</span>
            <span className="eq-kpi-meta">{counts.all > 0 ? ((counts.maintenance / counts.all) * 100).toFixed(1) : '0.0'}% {t('equipment.kpi_of_total')}</span>
          </div>
        </div>
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('equipment.kpi_out_of_service')}</span>
            <span className="eq-kpi-value">{counts.outOfService}</span>
            <span className="eq-kpi-meta">{counts.all > 0 ? ((counts.outOfService / counts.all) * 100).toFixed(1) : '0.0'}% {t('equipment.kpi_of_total')}</span>
          </div>
        </div>
      </div>

      {/* Search + Filters + Add button */}
      <div className="eq-toolbar">
        <div className="eq-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder={t('equipment.search_placeholder')} value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }} />
        </div>
        <div className="eq-filters">
          <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1) }}>
            <option value="">{t('equipment.filter_all_categories')}</option>
            {categories.map(c => { const translated = t(`equipment.cat_${c.replace(/ /g, '_')}`); return <option key={c} value={c}>{translated.includes('.') ? c : translated}</option> })}
          </select>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}>
            <option value="">{t('equipment.filter_all_statuses')}</option>
            <option value="operational">{t('equipment.status_operational')}</option>
            <option value="under_maintenance">{t('equipment.status_maintenance')}</option>
            <option value="out_of_service">{t('equipment.status_out')}</option>
          </select>
          <select value={filterCriticality} onChange={(e) => { setFilterCriticality(e.target.value); setCurrentPage(1) }}>
            <option value="">{t('equipment.filter_all_levels')}</option>
            <option value="low">{t('equipment.crit_low')}</option>
            <option value="medium">{t('equipment.crit_medium')}</option>
            <option value="high">{t('equipment.crit_high')}</option>
            <option value="critical">{t('equipment.crit_critical')}</option>
          </select>
          {canEdit && (
            <button className="eq-add-button" onClick={handleAdd}>+ {t('equipment.add_equipment')}</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="eq-tabs">
        <button className={`eq-tab ${activeTab === 'all' ? 'eq-tab-active' : ''}`} onClick={() => { setActiveTab('all'); setCurrentPage(1) }}>
          {t('equipment.tab_all')} ({counts.all})
        </button>
        <button className={`eq-tab eq-tab-green ${activeTab === 'operational' ? 'eq-tab-active' : ''}`} onClick={() => { setActiveTab('operational'); setCurrentPage(1) }}>
          {t('equipment.tab_operational')} ({counts.operational})
        </button>
        <button className={`eq-tab eq-tab-orange ${activeTab === 'maintenance' ? 'eq-tab-active' : ''}`} onClick={() => { setActiveTab('maintenance'); setCurrentPage(1) }}>
          {t('equipment.tab_maintenance')} ({counts.maintenance})
        </button>
        <button className={`eq-tab eq-tab-red ${activeTab === 'outOfService' ? 'eq-tab-active' : ''}`} onClick={() => { setActiveTab('outOfService'); setCurrentPage(1) }}>
          {t('equipment.tab_out_of_service')} ({counts.outOfService})
        </button>
        <button className={`eq-tab eq-tab-amber ${activeTab === 'dueMaintenance' ? 'eq-tab-active' : ''}`} onClick={() => { setActiveTab('dueMaintenance'); setCurrentPage(1) }}>
          {t('equipment.tab_due_maintenance')} ({counts.dueMaintenance})
        </button>
      </div>

      {/* Table */}
      <div className="eq-table-panel">
        <div className="table-wrapper">
          <table className="data-table eq-table">
            <thead>
              <tr>
                <th>{t('equipment.col_id')}</th>
                <th>{t('equipment.col_name')}</th>
                <th>{t('equipment.col_category')}</th>
                <th>{t('equipment.col_location')}</th>
                <th>{t('equipment.col_status')}</th>
                <th>{t('equipment.col_criticality')}</th>
                <th>{t('equipment.col_last_maintenance')}</th>
                <th>{t('equipment.col_next_maintenance')}</th>
                <th>{t('equipment.col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((eq) => (
                <tr key={eq.id}>
                  <td className="eq-id-cell">{eq.id}</td>
                  <td>
                    <div className="eq-name-cell">
                      <span className="eq-name">{eq.name}</span>
                      <span className="eq-model">{t('equipment.model_label')}: {eq.model}</span>
                    </div>
                  </td>
                  <td><span className="eq-category-badge">{(() => { const tr = t(`equipment.cat_${eq.category.replace(/ /g, '_')}`); return tr.includes('.') ? eq.category : tr; })()}</span></td>
                  <td>{eq.location}</td>
                  <td>
                    <span className={`eq-status-badge ${getStatusClass(eq.status)}`}>
                      <span className="eq-status-dot"></span>
                      {getStatusLabel(eq.status)}
                    </span>
                  </td>
                  <td><span className={`eq-crit-badge ${getCriticalityClass(eq.criticality)}`}>{getCriticalityLabel(eq.criticality)}</span></td>
                  <td>{eq.lastMaintenance}</td>
                  <td>
                    <div className="eq-next-cell">
                      <span>{eq.nextMaintenance}</span>
                      <span className={`eq-next-days ${eq.nextDays !== null && eq.nextDays <= 0 ? 'eq-overdue' : ''}`}>
                        {eq.nextDays === null || eq.nextDays === undefined ? '—' : eq.nextDays <= 0 ? t('equipment.overdue') : t('equipment.in_days').replace('{0}', eq.nextDays)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="eq-actions">
                      <button className="eq-action-btn" onClick={() => handleView(eq)} title="View">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      {canEdit && (
                        <button className="eq-action-btn" onClick={() => handleEdit(eq)} title="Edit">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr><td colSpan="9" className="eq-empty">{t('equipment.no_results')}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="eq-pagination">
          <span className="eq-pagination-info">
            {t('equipment.pagination_info').replace('{0}', Math.min((currentPage - 1) * pageSize + 1, filtered.length)).replace('{1}', Math.min(currentPage * pageSize, filtered.length)).replace('{2}', filtered.length)}
          </span>
          <div className="eq-pagination-controls">
            <button className="eq-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>&lt;</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`eq-page-btn ${currentPage === p ? 'eq-page-active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
            ))}
            {totalPages > 5 && <span className="eq-page-dots">...</span>}
            {totalPages > 5 && (
              <button className={`eq-page-btn ${currentPage === totalPages ? 'eq-page-active' : ''}`} onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
            )}
            <button className="eq-page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>&gt;</button>
            <select className="eq-page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}>
              {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s} {t('equipment.per_page')}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Slide-out Form Panel */}
      {showForm && (
        <EquipmentFormPanel
          equipment={editingEquipment}
          onClose={() => setShowForm(false)}
          onSubmit={handleFormSubmit}
          categories={categories}
          criticalities={['low', 'medium', 'high', 'critical']}
        />
      )}
    </div>
  )
}

export default EquipmentPage
