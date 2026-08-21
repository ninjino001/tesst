import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { fetchDashboardStats } from '../services/dashboardService'
import {
  HiOutlineCog,
  HiOutlineExclamationTriangle,
  HiOutlineWrenchScrewdriver,
} from 'react-icons/hi2'
import { TbCpu, TbBrain } from 'react-icons/tb'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import '../styles/dashboard.css'

function DashboardPage() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchDashboardStats()
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch dashboard stats:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-header">
          <h1>{t('pages.dashboard_title')}</h1>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  const totalEquipment = stats?.total_equipment || 0
  const activeInterventions = stats?.active_interventions || 0
  const criticalAlerts = stats?.critical_alerts || 0
  const availability = stats?.availability || 0
  const monthlyInterventions = stats?.monthly_interventions || []
  const equipmentByCategory = stats?.equipment_by_category || []
  const alertsTrend = stats?.alerts_trend || []
  const interventionsByPriority = stats?.interventions_by_priority || []
  const equipmentHealth = stats?.equipment_health || []
  const aiPredictions = stats?.ai_predictions || []

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <h1>{t('pages.dashboard_title')}</h1>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-row">
        <div className="kpi-card kpi-blue">
          <div className="kpi-icon"><HiOutlineCog /></div>
          <div className="kpi-content">
            <span className="kpi-value">{totalEquipment}</span>
            <span className="kpi-label">{t('dashboard.total_equipment')}</span>
          </div>
          <div className="kpi-trend"></div>
        </div>
        <div className="kpi-card kpi-purple">
          <div className="kpi-icon"><HiOutlineWrenchScrewdriver /></div>
          <div className="kpi-content">
            <span className="kpi-value">{activeInterventions}</span>
            <span className="kpi-label">{t('dashboard.active_interventions')}</span>
          </div>
          <div className="kpi-trend"></div>
        </div>
        <div className="kpi-card kpi-red">
          <div className="kpi-icon"><HiOutlineExclamationTriangle /></div>
          <div className="kpi-content">
            <span className="kpi-value">{criticalAlerts}</span>
            <span className="kpi-label">{t('dashboard.critical_alerts')}</span>
          </div>
          <div className="kpi-trend"></div>
        </div>
        <div className="kpi-card kpi-green">
          <div className="kpi-icon"><TbCpu /></div>
          <div className="kpi-content">
            <span className="kpi-value">{availability}%</span>
            <span className="kpi-label">{t('dashboard.equipment_availability')}</span>
          </div>
          <div className="kpi-trend"></div>
        </div>
      </div>

      {/* Charts Grid - Row 1 */}
      <div className="charts-grid-2col">
        {/* Interventions over 12 months - Line Chart */}
        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>{t('dashboard.chart_interventions_monthly')}</h3>
            <span className="chart-badge">{t('dashboard.chart_12months')}</span>
          </div>
          {monthlyInterventions.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyInterventions} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="preventive"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name={t('dashboard.chart_preventive')}
                />
                <Line
                  type="monotone"
                  dataKey="corrective"
                  stroke="#dc2626"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name={t('dashboard.chart_corrective')}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#64748b' }}>Aucune donnée disponible</p>
            </div>
          )}
        </div>

        {/* Equipment by category - Pie Chart */}
        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>{t('dashboard.chart_equipment_category')}</h3>
            <span className="chart-badge">{totalEquipment} {t('dashboard.chart_total')}</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={equipmentByCategory}
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={55}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
              >
                {equipmentByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Grid - Row 2 */}
      <div className="charts-grid-2col">
        {/* Alerts trend - Area Chart */}
        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>{t('dashboard.chart_alerts_trend')}</h3>
            <span className="chart-badge">{t('dashboard.chart_30days')}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={alertsTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="critical"
                stackId="1"
                stroke="#dc2626"
                fill="#fecaca"
                name={t('dashboard.chart_critical')}
              />
              <Area
                type="monotone"
                dataKey="warning"
                stackId="1"
                stroke="#d97706"
                fill="#fde68a"
                name={t('dashboard.chart_warning')}
              />
              <Area
                type="monotone"
                dataKey="info"
                stackId="1"
                stroke="#2563eb"
                fill="#bfdbfe"
                name={t('dashboard.chart_info')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Interventions by priority - Bar Chart */}
        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>{t('dashboard.chart_interventions_priority')}</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={interventionsByPriority} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
              <XAxis dataKey="priority" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} name={t('dashboard.chart_count')}>
                {interventionsByPriority.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Equipment Health + AI Predictions */}
      <div className="charts-grid-2col">
        {/* Equipment Health - Radial Bar */}
        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>{t('dashboard.chart_equipment_health')}</h3>
          </div>
          <div className="health-chart-container">
            <ResponsiveContainer width="50%" height={220}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="30%"
                outerRadius="100%"
                data={equipmentHealth}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  dataKey="value"
                  background={{ fill: '#f1f5f9' }}
                  cornerRadius={10}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="health-legend">
              {equipmentHealth.map((item) => (
                <div key={item.name} className="health-legend-item">
                  <span className="health-dot" style={{ background: item.fill }}></span>
                  <span className="health-label">{item.name}</span>
                  <span className="health-value">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Predictions Table */}
        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3><TbBrain style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />{t('dashboard.chart_ai_predictions')}</h3>
            <span className="chart-badge ai-badge">{t('dashboard.chart_ai_powered')}</span>
          </div>
          <div className="ai-predictions-list">
            {aiPredictions.map((pred, idx) => (
              <div key={idx} className="ai-prediction-row">
                <div className="pred-equipment">{pred.equipment}</div>
                <div className="pred-risk-bar-container">
                  <div
                    className="pred-risk-bar"
                    style={{
                      width: `${pred.risk}%`,
                      background: pred.risk > 75 ? '#dc2626' : pred.risk > 50 ? '#d97706' : '#16a34a'
                    }}
                  ></div>
                </div>
                <div className="pred-risk-value" style={{
                  color: pred.risk > 75 ? '#dc2626' : pred.risk > 50 ? '#d97706' : '#16a34a'
                }}>
                  {pred.risk}%
                </div>
                <div className="pred-deadline">{pred.deadline}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

export default DashboardPage
