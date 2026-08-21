import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

function EquipmentFormPanel({ equipment, onClose, onSubmit, categories, criticalities }) {
  const { t } = useLanguage()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    id: '',
    name: '',
    model: '',
    category: '',
    location: '',
    criticality: '',
    installationDate: '',
    description: '',
    status: 'operational',
    image: null,
    imagePreview: null,
  })

  useEffect(() => {
    if (equipment) {
      setForm({
        id: equipment.id || '',
        name: equipment.name || '',
        model: equipment.model || '',
        category: equipment.category || '',
        location: equipment.location || '',
        criticality: equipment.criticality || '',
        installationDate: equipment.installationDate || '',
        description: equipment.description || '',
        status: equipment.status || 'operational',
        image: null,
        imagePreview: equipment.image || null,
      })
    } else {
      setForm({
        id: 'Auto-generated',
        name: '',
        model: '',
        category: '',
        location: '',
        criticality: '',
        installationDate: '',
        description: '',
        status: 'Operational',
        image: null,
        imagePreview: null,
      })
    }
  }, [equipment])

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setForm(prev => ({ ...prev, image: file, imagePreview: ev.target.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setForm(prev => ({ ...prev, image: null, imagePreview: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = () => {
    onSubmit(form)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="eq-panel-backdrop" onClick={onClose}></div>

      {/* Panel */}
      <div className="eq-form-panel">
        <div className="eq-form-panel-header">
          <h2>{equipment ? t('equipment.form_edit_title') : t('equipment.form_add_title')}</h2>
          <button className="eq-panel-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="eq-form-panel-body">
          {/* Equipment ID */}
          <div className="eq-field">
            <label>{t('equipment.form_id')} *</label>
            <input type="text" value={form.id} disabled className="eq-input eq-input-disabled" />
          </div>

          {/* Name */}
          <div className="eq-field">
            <label>{t('equipment.form_name')} *</label>
            <input type="text" placeholder={t('equipment.form_name_placeholder')} value={form.name} onChange={(e) => handleChange('name', e.target.value)} className="eq-input" />
          </div>

          {/* Model */}
          <div className="eq-field">
            <label>{t('equipment.form_model')}</label>
            <input type="text" placeholder={t('equipment.form_model_placeholder')} value={form.model} onChange={(e) => handleChange('model', e.target.value)} className="eq-input" />
          </div>

          {/* Category */}
          <div className="eq-field">
            <label>{t('equipment.form_category')} *</label>
            <select value={form.category} onChange={(e) => handleChange('category', e.target.value)} className="eq-input">
              <option value="">{t('equipment.form_select_category')}</option>
              {categories.map(c => { const translated = t(`equipment.cat_${c.replace(/ /g, '_')}`); return <option key={c} value={c}>{translated.includes('.') ? c : translated}</option> })}
              <option value="__other__">{t('equipment.form_other_category')}</option>
            </select>
            {form.category === '__other__' && (
              <input type="text" placeholder={t('equipment.form_new_category_placeholder')} value={form.customCategory || ''} onChange={(e) => handleChange('customCategory', e.target.value)} className="eq-input" style={{ marginTop: '0.5rem' }} />
            )}
          </div>

          {/* Location */}
          <div className="eq-field">
            <label>{t('equipment.form_location')}</label>
            <input type="text" placeholder={t('equipment.form_location_placeholder')} value={form.location} onChange={(e) => handleChange('location', e.target.value)} className="eq-input" />
          </div>

          {/* Criticality */}
          <div className="eq-field">
            <label>{t('equipment.form_criticality')} *</label>
            <select value={form.criticality} onChange={(e) => handleChange('criticality', e.target.value)} className="eq-input">
              <option value="">{t('equipment.form_select_criticality')}</option>
              <option value="low">{t('equipment.crit_low')}</option>
              <option value="medium">{t('equipment.crit_medium')}</option>
              <option value="high">{t('equipment.crit_high')}</option>
              <option value="critical">{t('equipment.crit_critical')}</option>
            </select>
            <div className="eq-criticality-legend">
              <span className="eq-crit-dot eq-crit-dot-low"></span> {t('equipment.crit_low')}
              <span className="eq-crit-dot eq-crit-dot-medium"></span> {t('equipment.crit_medium')}
              <span className="eq-crit-dot eq-crit-dot-high"></span> {t('equipment.crit_high')}
              <span className="eq-crit-dot eq-crit-dot-critical"></span> {t('equipment.crit_critical')}
            </div>
          </div>

          {/* Installation Date */}
          <div className="eq-field">
            <label>{t('equipment.form_installation_date')}</label>
            <input type="date" value={form.installationDate} onChange={(e) => handleChange('installationDate', e.target.value)} className="eq-input" />
          </div>

          {/* Description */}
          <div className="eq-field">
            <label>{t('equipment.form_description')}</label>
            <textarea placeholder={t('equipment.form_description_placeholder')} value={form.description} onChange={(e) => handleChange('description', e.target.value)} className="eq-input eq-textarea" rows={3}></textarea>
          </div>

          {/* Status */}
          <div className="eq-field">
            <label>{t('equipment.form_status')} *</label>
            <select value={form.status} onChange={(e) => handleChange('status', e.target.value)} className="eq-input">
              <option value="operational">{t('equipment.status_operational')}</option>
              <option value="under_maintenance">{t('equipment.status_maintenance')}</option>
              <option value="out_of_service">{t('equipment.status_out')}</option>
            </select>
          </div>

          {/* Image Upload */}
          <div className="eq-field">
            <label>{t('equipment.form_image')}</label>
            <div className="eq-image-upload">
              {form.imagePreview ? (
                <div className="eq-image-preview">
                  <img src={form.imagePreview} alt="Equipment" />
                  <button className="eq-image-remove" onClick={handleRemoveImage}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <div className="eq-image-dropzone" onClick={() => fileInputRef.current?.click()}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  <span>{t('equipment.form_image_upload')}</span>
                  <span className="eq-image-hint">{t('equipment.form_image_hint')}</span>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="eq-form-panel-footer">
          <button className="eq-btn-cancel" onClick={onClose}>{t('equipment.form_cancel')}</button>
          <button className="eq-btn-save" onClick={handleSubmit}>{t('equipment.form_save')}</button>
        </div>
      </div>
    </>
  )
}

export default EquipmentFormPanel
