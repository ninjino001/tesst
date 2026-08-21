import { useLanguage } from '../contexts/LanguageContext'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const mttrData = [
  { month: 'Jan', mttr: 4.2 },
  { month: 'Fév', mttr: 3.8 },
  { month: 'Mar', mttr: 5.1 },
  { month: 'Avr', mttr: 3.5 },
  { month: 'Mai', mttr: 4.0 },
  { month: 'Jun', mttr: 3.2 },
]

const availabilityByZone = [
  { zone: 'Pistes', availability: 98.5 },
  { zone: 'Terminal 1', availability: 95.2 },
  { zone: 'Terminal 2', availability: 97.1 },
  { zone: 'Fret', availability: 93.8 },
  { zone: 'Tour contrôle', availability: 99.1 },
]

const interventionTypes = [
  { name: 'Préventive', value: 65, color: '#2563eb' },
  { name: 'Corrective', value: 35, color: '#dc2626' },
]

function AnalyticsPage() {
  const { t } = useLanguage()

  return (
    <div className="admin-page">
      <div className="page-heading-row">
        <div>
          <h1>{t('analytics.title')}</h1>
        </div>
      </div>

      <div className="charts-grid-2col">
        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>{t('analytics.mttr')}</h3>
            <span className="chart-badge">{t('analytics.hours')}</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mttrData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} unit="h" />
              <Tooltip />
              <Line type="monotone" dataKey="mttr" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>{t('analytics.availability_zone')}</h3>
            <span className="chart-badge">%</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={availabilityByZone} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
              <XAxis type="number" domain={[90, 100]} tick={{ fontSize: 12, fill: '#64748b' }} unit="%" />
              <YAxis type="category" dataKey="zone" tick={{ fontSize: 12, fill: '#64748b' }} width={100} />
              <Tooltip />
              <Bar dataKey="availability" fill="#16a34a" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-grid-2col">
        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>{t('analytics.intervention_types')}</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={interventionTypes} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {interventionTypes.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>{t('analytics.kpis')}</h3>
          </div>
          <div className="analytics-kpis">
            <div className="analytics-kpi-item">
              <span className="analytics-kpi-value">98.2%</span>
              <span className="analytics-kpi-label">{t('analytics.global_availability')}</span>
            </div>
            <div className="analytics-kpi-item">
              <span className="analytics-kpi-value">3.8h</span>
              <span className="analytics-kpi-label">{t('analytics.avg_mttr')}</span>
            </div>
            <div className="analytics-kpi-item">
              <span className="analytics-kpi-value">156</span>
              <span className="analytics-kpi-label">{t('analytics.total_interventions_month')}</span>
            </div>
            <div className="analytics-kpi-item">
              <span className="analytics-kpi-value">92%</span>
              <span className="analytics-kpi-label">{t('analytics.sla_compliance')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
