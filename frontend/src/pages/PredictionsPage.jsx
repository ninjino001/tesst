import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useNavigate } from 'react-router-dom'
import '../styles/predictions.css'

function PredictionsPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ summary: {}, predictions: [] })

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const res = await fetch('/api/ai/predictions/?limit=50', {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error('Failed to load predictions:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const getRiskColor = (score) => {
    if (score >= 80) return '#dc2626'
    if (score >= 60) return '#ea580c'
    if (score >= 40) return '#d97706'
    return '#16a34a'
  }

  const getRiskBg = (level) => {
    if (level === 'critical') return '#fee2e2'
    if (level === 'high') return '#fff7ed'
    if (level === 'warning') return '#fefce8'
    return '#f0fdf4'
  }

  const { summary } = data
  const predictions = data.predictions || []

  if (loading) {
    return (
      <div className="admin-page">
        <h1>{t('predictions.title')}</h1>
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          {t('predictions.loading')}
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page predictions-page">
      <div className="page-heading-row">
        <h1>{t('predictions.title')}</h1>
      </div>
      <p className="pred-subtitle">{t('predictions.subtitle')}</p>

      {/* KPI Summary */}
      <div className="eq-kpi-row">
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('predictions.kpi_analyzed')}</span>
            <span className="eq-kpi-value">{summary.total_analyzed || 0}</span>
          </div>
        </div>
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('predictions.kpi_critical')}</span>
            <span className="eq-kpi-value">{summary.critical || 0}</span>
          </div>
        </div>
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('predictions.kpi_high')}</span>
            <span className="eq-kpi-value">{summary.high || 0}</span>
          </div>
        </div>
        <div className="eq-kpi-card">
          <div className="eq-kpi-icon eq-kpi-green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <div className="eq-kpi-content">
            <span className="eq-kpi-label">{t('predictions.kpi_normal')}</span>
            <span className="eq-kpi-value">{summary.normal || 0}</span>
          </div>
        </div>
      </div>

      {/* Predictions List */}
      {predictions.length === 0 ? (
        <div className="pred-empty">
          <p>{t('predictions.no_data')}</p>
        </div>
      ) : (
        <div className="pred-grid">
          {predictions.map((pred, idx) => (
            <div
              key={idx}
              className="pred-card"
              style={{ borderLeftColor: getRiskColor(pred.risk_score) }}
              onClick={() => navigate(`/app/equipment/${pred.equipment_reference}/sensors`)}
            >
              <div className="pred-card-header">
                <div className="pred-card-equipment">
                  <h3>{pred.equipment_name}</h3>
                  <span className="pred-card-ref">{pred.equipment_reference}</span>
                </div>
                <div className="pred-card-score" style={{ background: getRiskBg(pred.risk_level), color: getRiskColor(pred.risk_score) }}>
                  {pred.risk_score}%
                </div>
              </div>

              <div className="pred-card-sensor">
                <span className="pred-sensor-name">{pred.sensor_name}</span>
                <span className="pred-sensor-value">{pred.current_value} {pred.unit}</span>
                <span className="pred-sensor-threshold">/ {pred.threshold} {pred.unit}</span>
              </div>

              <div className="pred-card-details">
                <div className="pred-detail">
                  <span className="pred-detail-label">{t('predictions.trend')}</span>
                  <span className="pred-detail-value">
                    {pred.trend_direction === 'increasing' ? '+' : pred.trend_direction === 'decreasing' ? '-' : '='}
                    {' '}{pred.slope_per_hour > 0 ? '+' : ''}{pred.slope_per_hour}/{t('predictions.per_hour')}
                  </span>
                </div>
                <div className="pred-detail">
                  <span className="pred-detail-label">{t('predictions.rul')}</span>
                  <span className="pred-detail-value pred-rul" style={{ color: getRiskColor(pred.risk_score) }}>
                    {pred.rul_display}
                  </span>
                </div>
                <div className="pred-detail">
                  <span className="pred-detail-label">{t('predictions.z_score')}</span>
                  <span className="pred-detail-value">
                    {pred.z_score} {pred.is_anomaly ? '(!)' : ''}
                  </span>
                </div>
                <div className="pred-detail">
                  <span className="pred-detail-label">R²</span>
                  <span className="pred-detail-value">{pred.r_squared}</span>
                </div>
              </div>

              {/* Score Breakdown Bar */}
              <div className="pred-card-breakdown">
                <div className="pred-bar-container">
                  <div className="pred-bar-segment" style={{ width: `${pred.proximity_score * 0.4}%`, background: '#2563eb' }} title={`Proximité: ${pred.proximity_score}%`}></div>
                  <div className="pred-bar-segment" style={{ width: `${pred.degradation_score * 0.35}%`, background: '#d97706' }} title={`Dégradation: ${pred.degradation_score}%`}></div>
                  <div className="pred-bar-segment" style={{ width: `${pred.anomaly_score * 0.25}%`, background: '#dc2626' }} title={`Anomalie: ${pred.anomaly_score}%`}></div>
                </div>
                <div className="pred-bar-legend">
                  <span><span className="pred-legend-dot" style={{ background: '#2563eb' }}></span>{t('predictions.proximity')}</span>
                  <span><span className="pred-legend-dot" style={{ background: '#d97706' }}></span>{t('predictions.degradation')}</span>
                  <span><span className="pred-legend-dot" style={{ background: '#dc2626' }}></span>{t('predictions.anomaly')}</span>
                </div>
              </div>

              <div className="pred-card-recommendation">
                <span>{pred.recommendation}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PredictionsPage
