import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

const MOCK_PLANNED = [
  { id: 1, ref: 'INT-2026-005', equipment: 'Éclairage Piste 09L', technician: 'Ahmed Bennani', date: '2026-08-12', priority: 'Haute', status: 'planned' },
  { id: 2, ref: 'INT-2026-006', equipment: 'CVC Terminal 1', technician: 'Sara Idrissi', date: '2026-08-13', priority: 'Moyenne', status: 'planned' },
  { id: 3, ref: 'INT-2026-007', equipment: 'Groupe élec. Fret', technician: 'Youssef Alami', date: '2026-08-14', priority: 'Basse', status: 'planned' },
  { id: 4, ref: 'INT-2026-008', equipment: 'Radar RWY-27R', technician: 'Ahmed Bennani', date: '2026-08-15', priority: 'Critique', status: 'planned' },
  { id: 5, ref: 'INT-2026-002', equipment: 'Groupe électrogène T2', technician: 'Karim Fassi', date: '2026-08-10', priority: 'Critique', status: 'in_progress' },
]

function PlanningPage() {
  const { t } = useLanguage()
  const [planned] = useState(MOCK_PLANNED)

  return (
    <div className="admin-page">
      <div className="page-heading-row">
        <div>
          <h1>{t('planning.title')}</h1>
        </div>
      </div>

      <div className="table-panel">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('planning.reference')}</th>
                <th>{t('planning.equipment')}</th>
                <th>{t('planning.technician')}</th>
                <th>{t('planning.date')}</th>
                <th>{t('planning.priority')}</th>
                <th>{t('planning.status')}</th>
              </tr>
            </thead>
            <tbody>
              {planned.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{item.ref}</td>
                  <td>{item.equipment}</td>
                  <td>{item.technician}</td>
                  <td>{item.date}</td>
                  <td>
                    <span className={`priority-badge priority-${item.priority === 'Critique' ? 'critical' : item.priority === 'Haute' ? 'high' : item.priority === 'Moyenne' ? 'medium' : 'low'}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge-sm ${item.status === 'planned' ? 'status-assigned' : 'status-in-progress'}`}>
                      {item.status === 'planned' ? t('planning.status_planned') : t('planning.status_in_progress')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default PlanningPage
