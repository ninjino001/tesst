import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { fetchEquipmentDetail } from '../services/equipmentService'
import { fetchSensorLatest, fetchSensorReadings, createSensor } from '../services/dashboardService'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import '../styles/sensor-charts.css'

const SENSOR_COLORS = [
  '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed',
  '#0891b2', '#e11d48', '#65a30d'
]

const TIME_RANGES = [
  { value: '6', unit: 'hours', labelKey: 'sensor_charts.range_6h' },
  { value: '24', unit: 'hours', labelKey: 'sensor_charts.range_24h' },
  { value: '7', unit: 'days', labelKey: 'sensor_charts.range_7d' },
  { value: '30', unit: 'days', labelKey: 'sensor_charts.range_30d' },
]

const SENSOR_TYPES = [
  { value: 'temperature', label: 'Température', unit: '°C', minN: 15, maxN: 35, alert: 40, critical: 50 },
  { value: 'humidity', label: 'Humidité', unit: '%', minN: 30, maxN: 60, alert: 65, critical: 80 },
  { value: 'vibration', label: 'Vibration', unit: 'mm/s', minN: 0.5, maxN: 3.0, alert: 4.0, critical: 6.0 },
  { value: 'pressure', label: 'Pression', unit: 'bar', minN: 2.0, maxN: 5.0, alert: 6.0, critical: 8.0 },
  { value: 'power', label: 'Consommation', unit: 'kW', minN: 1, maxN: 15, alert: 18, critical: 25 },
  { value: 'airflow', label: 'Débit air', unit: 'm³/h', minN: 500, maxN: 1500, alert: 1600, critical: 2000 },
  { value: 'voltage', label: 'Tension', unit: 'V', minN: 210, maxN: 240, alert: 200, critical: 190 },
  { value: 'current', label: 'Courant', unit: 'A', minN: 5, maxN: 25, alert: 30, critical: 40 },
  { value: 'runtime', label: 'Runtime', unit: 'h', minN: 0, maxN: 10000, alert: 12000, critical: 15000 },
]

function SensorChartsPage() {
  const { id } = useParams()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [equipment, setEquipment] = useState(null)
  const [sensors, setSensors] = useState([])
  const [readings, setReadings] = useState({})
  const [loading, setLoading] = useState(true)
  const [chartsLoading, setChartsLoading] = useState(false)
  const [selectedRange, setSelectedRange] = useState('24')
  const [selectedUnit, setSelectedUnit] = useState('hours')
  const [visibleSensors, setVisibleSensors] = useState({})
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [showAddSensor, setShowAddSensor] = useState(false)
  const [sensorForm, setSensorForm] = useState({
    sensor_type: 'temperature',
    name: '',
    unit: '°C',
    protocol: 'modbus_tcp',
    host: '',
    port: 502,
    register: '',
    min_normal: 15,
    max_normal: 35,
    alert_threshold: 40,
    critical_threshold: 50,
  })

  // Load equipment and sensors
  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setLoading(true)
        const [eqData, sensorsData] = await Promise.all([
          fetchEquipmentDetail(id),
          fetchSensorLatest(id),
        ])
        if (cancelled) return
        setEquipment(eqData)
        setSensors(sensorsData)
        // All sensors visible by default
        const visible = {}
        sensorsData.forEach(s => { visible[s.id] = true })
        setVisibleSensors(visible)
      } catch (err) {
        console.error('Failed to load sensor data:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [id])

  // Load readings when sensors or time range changes
  const loadReadings = useCallback(async () => {
    if (sensors.length === 0) return
    try {
      setChartsLoading(true)
      const params = selectedUnit === 'hours'
        ? { hours: selectedRange }
        : { days: selectedRange }

      const results = await Promise.all(
        sensors.map(s => fetchSensorReadings(s.id, params).then(data => ({ id: s.id, data })))
      )
      const readingsMap = {}
      results.forEach(r => { readingsMap[r.id] = r.data })
      setReadings(readingsMap)
    } catch (err) {
      console.error('Failed to load readings:', err)
    } finally {
      setChartsLoading(false)
    }
  }, [sensors, selectedRange, selectedUnit])

  useEffect(() => {
    loadReadings()
  }, [loadReadings])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      loadReadings()
    }, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadReadings])

  const handleRangeChange = (value, unit) => {
    setSelectedRange(value)
    setSelectedUnit(unit)
  }

  const toggleSensor = (sensorId) => {
    setVisibleSensors(prev => ({ ...prev, [sensorId]: !prev[sensorId] }))
  }

  // Handle sensor type change - auto-fill defaults
  const handleSensorTypeChange = (typeValue) => {
    const config = SENSOR_TYPES.find(t => t.value === typeValue)
    if (config) {
      setSensorForm(prev => ({
        ...prev,
        sensor_type: typeValue,
        name: config.label + ' – ' + (equipment?.name || id),
        unit: config.unit,
        min_normal: config.minN,
        max_normal: config.maxN,
        alert_threshold: config.alert,
        critical_threshold: config.critical,
      }))
    }
  }

  // Create sensor
  const handleAddSensor = async () => {
    try {
      const payload = {
        equipment: equipment.id,
        sensor_type: sensorForm.sensor_type,
        name: sensorForm.name,
        reference: `SENS-${sensorForm.sensor_type[0].toUpperCase()}-${Date.now().toString().slice(-4)}`,
        unit: sensorForm.unit,
        protocol: sensorForm.protocol,
        host: sensorForm.host,
        port: parseInt(sensorForm.port, 10) || null,
        register: sensorForm.register,
        min_normal: parseFloat(sensorForm.min_normal),
        max_normal: parseFloat(sensorForm.max_normal),
        alert_threshold: parseFloat(sensorForm.alert_threshold),
        critical_threshold: parseFloat(sensorForm.critical_threshold),
        status: 'active',
      }
      await createSensor(payload)
      setShowAddSensor(false)
      // Reload sensors
      const sensorsData = await fetchSensorLatest(id)
      setSensors(sensorsData)
      const visible = {}
      sensorsData.forEach(s => { visible[s.id] = true })
      setVisibleSensors(visible)
    } catch (error) {
      console.error('Failed to create sensor:', error)
      alert('Erreur: ' + error.message)
    }
  }

  // Compute stats for a sensor's readings
  const computeStats = (readingsArr) => {
    if (!readingsArr || readingsArr.length === 0) return { avg: '—', min: '—', max: '—' }
    const values = readingsArr.map(r => r.value)
    const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
    const min = Math.min(...values).toFixed(1)
    const max = Math.max(...values).toFixed(1)
    return { avg, min, max }
  }

  // Health score based on sensors
  const healthScore = sensors.length > 0
    ? Math.round((sensors.filter(s => s.status === 'Normal').length / sensors.length) * 100)
    : 0

  const sensorOverview = {
    normal: sensors.filter(s => s.status === 'Normal').length,
    warning: sensors.filter(s => s.status === 'Warning').length,
    critical: sensors.filter(s => s.status === 'Critical').length,
    offline: sensors.filter(s => s.status === 'Offline' || !s.value).length,
  }

  if (loading) {
    return (
      <div className="sensor-charts-page">
        <div className="sc-loading">
          <div className="sc-loading-spinner"></div>
          <p>{t('sensor_charts.loading')}</p>
        </div>
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="sensor-charts-page">
        <p>{t('sensor_charts.not_found')}</p>
      </div>
    )
  }

  const statusClass = equipment.status === 'operational' ? 'sc-badge-green'
    : equipment.status === 'under_maintenance' ? 'sc-badge-orange'
    : 'sc-badge-red'

  const statusLabel = equipment.status === 'operational' ? t('equipment.status_operational')
    : equipment.status === 'under_maintenance' ? t('equipment.status_maintenance')
    : t('equipment.status_out')

  return (
    <div className="sensor-charts-page">
      {/* Header */}
      <div className="sc-header">
        <div className="sc-header-left">
          <div className="sc-breadcrumb">
            <span className="sc-breadcrumb-link" onClick={() => navigate('/app/equipment')}>{t('sensor_charts.breadcrumb_equipment')}</span>
            <span className="sc-breadcrumb-sep">&gt;</span>
            <span className="sc-breadcrumb-link" onClick={() => navigate(`/app/equipment/${id}`)}>{id}</span>
            <span className="sc-breadcrumb-sep">&gt;</span>
            <span className="sc-breadcrumb-current">{t('sensor_charts.title')}</span>
          </div>
          <h1>{t('sensor_charts.title')}</h1>
          <p className="sc-subtitle">{t('sensor_charts.subtitle')}</p>
        </div>
      </div>

      {/* Equipment Info Card */}
      <div className="sc-equipment-card">
        <div className="sc-eq-image">
          {equipment.image ? (
            <img src={equipment.image} alt={equipment.name} />
          ) : (
            <div className="sc-eq-placeholder">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </div>
          )}
        </div>
        <div className="sc-eq-info">
          <div className="sc-eq-title-row">
            <h2>{equipment.name} ({id})</h2>
            <span className={`sc-status-badge ${statusClass}`}>{statusLabel}</span>
          </div>
          <div className="sc-eq-details">
            <div className="sc-eq-detail">
              <span className="sc-eq-detail-label">{t('sensor_charts.category')}</span>
              <span className="sc-eq-detail-value">{equipment.category_name}</span>
            </div>
            <div className="sc-eq-detail">
              <span className="sc-eq-detail-label">{t('sensor_charts.model')}</span>
              <span className="sc-eq-detail-value">{equipment.model}</span>
            </div>
            <div className="sc-eq-detail">
              <span className="sc-eq-detail-label">{t('sensor_charts.serial_number')}</span>
              <span className="sc-eq-detail-value">{equipment.serial_number || '—'}</span>
            </div>
            <div className="sc-eq-detail">
              <span className="sc-eq-detail-label">{t('sensor_charts.location')}</span>
              <span className="sc-eq-detail-value">{equipment.location || '—'}</span>
            </div>
          </div>
        </div>
        <div className="sc-eq-health">
          <span className="sc-health-label">{t('sensor_charts.health_score')}</span>
          <div className="sc-health-gauge">
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="6"/>
              <circle cx="32" cy="32" r="28" fill="none"
                stroke={healthScore >= 80 ? '#16a34a' : healthScore >= 50 ? '#d97706' : '#dc2626'}
                strokeWidth="6"
                strokeDasharray={`${(healthScore / 100) * 176} 176`}
                strokeLinecap="round" transform="rotate(-90 32 32)"/>
              <text x="32" y="36" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">{healthScore}%</text>
            </svg>
          </div>
          <span className="sc-health-status" style={{ color: healthScore >= 80 ? '#16a34a' : healthScore >= 50 ? '#d97706' : '#dc2626' }}>
            {healthScore >= 80 ? t('sensor_charts.health_good') : healthScore >= 50 ? t('sensor_charts.health_fair') : t('sensor_charts.health_poor')}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="sc-toolbar">
        <div className="sc-toolbar-left">
          <div className="sc-range-buttons">
            {TIME_RANGES.map(range => (
              <button
                key={`${range.value}-${range.unit}`}
                className={`sc-range-btn ${selectedRange === range.value && selectedUnit === range.unit ? 'sc-range-active' : ''}`}
                onClick={() => handleRangeChange(range.value, range.unit)}
              >
                {t(range.labelKey)}
              </button>
            ))}
          </div>
        </div>
        <div className="sc-toolbar-right">
          <button className="sc-add-sensor-btn" onClick={() => { handleSensorTypeChange('temperature'); setShowAddSensor(true) }}>
            + {t('sensor_charts.add_sensor')}
          </button>
          <label className="sc-auto-refresh">
            <span>{t('sensor_charts.auto_refresh')}</span>
            <button
              className={`sc-toggle ${autoRefresh ? 'sc-toggle-on' : ''}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <span className="sc-toggle-knob"></span>
            </button>
          </label>
          <button className="sc-refresh-btn" onClick={loadReadings} title={t('sensor_charts.refresh')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="sc-content">
        {/* Charts Grid */}
        <div className="sc-charts-grid">
          {chartsLoading && (
            <div className="sc-charts-overlay">
              <div className="sc-loading-spinner"></div>
            </div>
          )}
          {sensors.filter(s => visibleSensors[s.id]).map((sensor, idx) => {
            const sensorReadings = readings[sensor.id] || []
            const stats = computeStats(sensorReadings)
            const color = SENSOR_COLORS[idx % SENSOR_COLORS.length]

            // Format readings for chart
            const chartData = sensorReadings.map(r => ({
              time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              value: r.value,
              timestamp: r.timestamp,
            }))

            return (
              <div key={sensor.id} className="sc-chart-card">
                <div className="sc-chart-header">
                  <div className="sc-chart-title">
                    <span className="sc-chart-color-dot" style={{ background: color }}></span>
                    <h3>{sensor.name} ({sensor.unit})</h3>
                  </div>
                </div>
                <div className="sc-chart-stats">
                  <div className="sc-stat">
                    <span className="sc-stat-label">{t('sensor_charts.average')}</span>
                    <span className="sc-stat-value" style={{ color }}>{stats.avg} <small>{sensor.unit}</small></span>
                  </div>
                  <div className="sc-stat">
                    <span className="sc-stat-label">{t('sensor_charts.min')}</span>
                    <span className="sc-stat-value">{stats.min} <small>{sensor.unit}</small></span>
                  </div>
                  <div className="sc-stat">
                    <span className="sc-stat-label">{t('sensor_charts.max')}</span>
                    <span className="sc-stat-value">{stats.max} <small>{sensor.unit}</small></span>
                  </div>
                </div>
                <div className="sc-chart-container">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`gradient-${sensor.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.15}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                        <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '0.85rem' }}
                          labelFormatter={(label) => `⏱ ${label}`}
                          formatter={(value) => [`${value} ${sensor.unit}`, sensor.name]}
                        />
                        <ReferenceLine y={sensor.max_normal} stroke="#d97706" strokeDasharray="4 4" label={{ value: t('sensor_charts.alert_line'), position: 'right', fontSize: 10, fill: '#d97706' }} />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={color}
                          strokeWidth={2}
                          fill={`url(#gradient-${sensor.id})`}
                          dot={false}
                          activeDot={{ r: 4, fill: color }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="sc-chart-empty">
                      <p>{t('sensor_charts.no_data')}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {sensors.filter(s => visibleSensors[s.id]).length === 0 && (
            <div className="sc-no-sensors">
              <p>{t('sensor_charts.no_sensors_selected')}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="sc-sidebar">
          {/* Sensors Overview */}
          <div className="sc-sidebar-panel">
            <h4>{t('sensor_charts.sensors_overview')}</h4>
            <div className="sc-overview-donut">
              <svg width="100" height="100" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="10"/>
                {/* Normal segment */}
                {sensorOverview.normal > 0 && (
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#16a34a" strokeWidth="10"
                    strokeDasharray={`${(sensorOverview.normal / sensors.length) * 251.3} 251.3`}
                    strokeDashoffset="0" transform="rotate(-90 50 50)"/>
                )}
                {/* Warning segment */}
                {sensorOverview.warning > 0 && (
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#d97706" strokeWidth="10"
                    strokeDasharray={`${(sensorOverview.warning / sensors.length) * 251.3} 251.3`}
                    strokeDashoffset={`${-(sensorOverview.normal / sensors.length) * 251.3}`}
                    transform="rotate(-90 50 50)"/>
                )}
                {/* Critical segment */}
                {sensorOverview.critical > 0 && (
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#dc2626" strokeWidth="10"
                    strokeDasharray={`${(sensorOverview.critical / sensors.length) * 251.3} 251.3`}
                    strokeDashoffset={`${-((sensorOverview.normal + sensorOverview.warning) / sensors.length) * 251.3}`}
                    transform="rotate(-90 50 50)"/>
                )}
                <text x="50" y="46" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a">{sensors.length}</text>
                <text x="50" y="62" textAnchor="middle" fontSize="10" fill="#64748b">{t('sensor_charts.sensors')}</text>
              </svg>
            </div>
            <div className="sc-overview-legend">
              <div className="sc-legend-item"><span className="sc-legend-dot" style={{ background: '#16a34a' }}></span> {t('sensor_charts.status_normal')} <strong>{sensorOverview.normal} ({sensors.length > 0 ? Math.round(sensorOverview.normal / sensors.length * 100) : 0}%)</strong></div>
              <div className="sc-legend-item"><span className="sc-legend-dot" style={{ background: '#d97706' }}></span> {t('sensor_charts.status_warning')} <strong>{sensorOverview.warning} ({sensors.length > 0 ? Math.round(sensorOverview.warning / sensors.length * 100) : 0}%)</strong></div>
              <div className="sc-legend-item"><span className="sc-legend-dot" style={{ background: '#dc2626' }}></span> {t('sensor_charts.status_critical')} <strong>{sensorOverview.critical} ({sensors.length > 0 ? Math.round(sensorOverview.critical / sensors.length * 100) : 0}%)</strong></div>
              <div className="sc-legend-item"><span className="sc-legend-dot" style={{ background: '#94a3b8' }}></span> {t('sensor_charts.status_offline')} <strong>{sensorOverview.offline} ({sensors.length > 0 ? Math.round(sensorOverview.offline / sensors.length * 100) : 0}%)</strong></div>
            </div>
          </div>

          {/* Sensors Toggle List */}
          <div className="sc-sidebar-panel">
            <h4>{t('sensor_charts.sensors')}</h4>
            <div className="sc-sensors-list">
              {sensors.map((sensor, idx) => (
                <div key={sensor.id} className="sc-sensor-item">
                  <label className="sc-sensor-toggle">
                    <input
                      type="checkbox"
                      checked={visibleSensors[sensor.id] || false}
                      onChange={() => toggleSensor(sensor.id)}
                    />
                    <span className="sc-sensor-color" style={{ background: SENSOR_COLORS[idx % SENSOR_COLORS.length] }}></span>
                    <span className="sc-sensor-name">{sensor.name}</span>
                  </label>
                  <span className={`sc-sensor-status sc-sensor-${sensor.status?.toLowerCase() || 'normal'}`}>
                    {sensor.status || 'Normal'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="sc-sidebar-panel sc-info-box">
            <div className="sc-info-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <div>
              <strong>{t('sensor_charts.about_title')}</strong>
              <p>{t('sensor_charts.about_desc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Sensor Modal */}
      {showAddSensor && (
        <>
          <div className="eq-panel-backdrop" onClick={() => setShowAddSensor(false)}></div>
          <div className="eq-form-panel">
            <div className="eq-form-panel-header">
              <h2>{t('sensor_charts.add_sensor')}</h2>
              <button className="eq-panel-close" onClick={() => setShowAddSensor(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="eq-form-panel-body">
              <div className="eq-field">
                <label>{t('sensor_charts.form_type')} *</label>
                <select className="eq-input" value={sensorForm.sensor_type} onChange={(e) => handleSensorTypeChange(e.target.value)}>
                  {SENSOR_TYPES.map(st => (
                    <option key={st.value} value={st.value}>{st.label} ({st.unit})</option>
                  ))}
                </select>
              </div>
              <div className="eq-field">
                <label>{t('sensor_charts.form_name')} *</label>
                <input type="text" className="eq-input" value={sensorForm.name} onChange={(e) => setSensorForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="eq-field">
                <label>{t('sensor_charts.form_unit')}</label>
                <input type="text" className="eq-input" value={sensorForm.unit} onChange={(e) => setSensorForm(f => ({ ...f, unit: e.target.value }))} />
              </div>

              {/* Connection Configuration */}
              <div className="sc-form-section-title">{t('sensor_charts.form_connection')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="eq-field">
                  <label>{t('sensor_charts.form_protocol')} *</label>
                  <select className="eq-input" value={sensorForm.protocol} onChange={(e) => setSensorForm(f => ({ ...f, protocol: e.target.value }))}>
                    <option value="modbus_tcp">Modbus TCP</option>
                    <option value="mqtt">MQTT</option>
                    <option value="opcua">OPC-UA</option>
                    <option value="http">HTTP API</option>
                  </select>
                </div>
                <div className="eq-field">
                  <label>{t('sensor_charts.form_host')} *</label>
                  <input type="text" className="eq-input" placeholder="192.168.1.50" value={sensorForm.host} onChange={(e) => setSensorForm(f => ({ ...f, host: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="eq-field">
                  <label>{t('sensor_charts.form_port')}</label>
                  <input type="number" className="eq-input" placeholder="502" value={sensorForm.port} onChange={(e) => setSensorForm(f => ({ ...f, port: e.target.value }))} />
                </div>
                <div className="eq-field">
                  <label>{t('sensor_charts.form_register')}</label>
                  <input type="text" className="eq-input" placeholder="40001" value={sensorForm.register} onChange={(e) => setSensorForm(f => ({ ...f, register: e.target.value }))} />
                </div>
              </div>

              {/* Thresholds */}
              <div className="sc-form-section-title">{t('sensor_charts.form_thresholds')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="eq-field">
                  <label>{t('sensor_charts.form_min_normal')}</label>
                  <input type="number" step="0.1" className="eq-input" value={sensorForm.min_normal} onChange={(e) => setSensorForm(f => ({ ...f, min_normal: e.target.value }))} />
                </div>
                <div className="eq-field">
                  <label>{t('sensor_charts.form_max_normal')}</label>
                  <input type="number" step="0.1" className="eq-input" value={sensorForm.max_normal} onChange={(e) => setSensorForm(f => ({ ...f, max_normal: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="eq-field">
                  <label>{t('sensor_charts.form_alert_threshold')}</label>
                  <input type="number" step="0.1" className="eq-input" value={sensorForm.alert_threshold} onChange={(e) => setSensorForm(f => ({ ...f, alert_threshold: e.target.value }))} />
                </div>
                <div className="eq-field">
                  <label>{t('sensor_charts.form_critical_threshold')}</label>
                  <input type="number" step="0.1" className="eq-input" value={sensorForm.critical_threshold} onChange={(e) => setSensorForm(f => ({ ...f, critical_threshold: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="eq-form-panel-footer">
              <button className="eq-btn-cancel" onClick={() => setShowAddSensor(false)}>{t('sensor_charts.form_cancel')}</button>
              <button className="eq-btn-save" onClick={handleAddSensor} disabled={!sensorForm.name || !sensorForm.host}>{t('sensor_charts.form_connect')}</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default SensorChartsPage
