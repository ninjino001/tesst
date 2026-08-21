import { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

function UserFormModal({ open, onClose, onSubmit, initialData, roles = [] }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role_title: roles[0] || '',
    is_active: true,
  })

  useEffect(() => {
    if (initialData) {
      setForm({
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        email: initialData.email || '',
        role_title: initialData.role_title || roles[0] || '',
        is_active: initialData.is_active ?? true,
      })
    } else {
      setForm({
        first_name: '',
        last_name: '',
        email: '',
        role_title: roles[0] || '',
        is_active: true,
      })
    }
  }, [initialData, roles])

  if (!open) return null

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{initialData ? t('users.edit_user') : t('users.new_user')}</h3>
          <button className="icon-button" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label className="field-group">
            <span>{t('users.field_first_name')}</span>
            <input type="text" value={form.first_name} onChange={(e) => setForm((c) => ({ ...c, first_name: e.target.value }))} />
          </label>
          <label className="field-group">
            <span>{t('users.field_last_name')}</span>
            <input type="text" value={form.last_name} onChange={(e) => setForm((c) => ({ ...c, last_name: e.target.value }))} />
          </label>
          <label className="field-group">
            <span>{t('users.field_email')}</span>
            <input type="text" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
          </label>
          <label className="field-group">
            <span>{t('users.field_role')}</span>
            <select value={form.role_title} onChange={(e) => setForm((c) => ({ ...c, role_title: e.target.value }))}>
              <option value="">{t('users.select_role')}</option>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="field-group">
            <span>{t('users.field_active')}</span>
            <select value={form.is_active ? 'true' : 'false'} onChange={(e) => setForm((current) => ({ ...current, is_active: e.target.value === 'true' }))}>
              <option value="true">{t('users.active')}</option>
              <option value="false">{t('users.inactive')}</option>
            </select>
          </label>
        </div>
        <div className="modal-actions">
          <button className="primary-button" onClick={() => onSubmit(form)}>
            {initialData ? t('users.save') : t('users.create')}
          </button>
          <button className="cancel-button" onClick={onClose}>
            {t('users.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserFormModal
