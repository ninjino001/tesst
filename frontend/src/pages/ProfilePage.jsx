import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import '../styles/equipment.css'

function ProfilePage() {
  const { t } = useLanguage()
  const { user, userRole } = useAuth()

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordMsg, setPasswordMsg] = useState(null)
  const [passwordError, setPasswordError] = useState(null)

  const handlePasswordChange = async () => {
    setPasswordMsg(null)
    setPasswordError(null)

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError(t('profile.error_fill_all'))
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError(t('profile.error_min_length'))
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('profile.error_mismatch'))
      return
    }

    // TODO: API call to change password
    try {
      const csrfMatch = document.cookie.match(/csrftoken=([^;]+)/)
      const csrfToken = csrfMatch ? csrfMatch[1] : null
      const res = await fetch('/api/auth/change-password/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPasswordError(data.error || 'Erreur')
        return
      }
      setPasswordMsg(t('profile.success_password'))
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPasswordError('Erreur de connexion')
    }
  }

  return (
    <div className="admin-page" style={{ maxWidth: '800px' }}>
      <h1>{t('profile.title')}</h1>

      {/* User Info */}
      <div className="eq-info-panel" style={{ marginTop: '1rem' }}>
        <h3>{t('profile.personal_info')}</h3>
        <div className="eq-info-rows">
          <div className="eq-info-row"><span>{t('profile.full_name')}</span><span>{user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : '—'}</span></div>
          <div className="eq-info-row"><span>{t('profile.username')}</span><span>{user?.username || '—'}</span></div>
          <div className="eq-info-row"><span>{t('profile.email')}</span><span>{user?.email || '—'}</span></div>
          <div className="eq-info-row"><span>{t('profile.role')}</span><span className="eq-category-badge" style={{ margin: 0 }}>{userRole || '—'}</span></div>
          <div className="eq-info-row"><span>{t('profile.last_login')}</span><span>{user?.last_login ? new Date(user.last_login).toLocaleString() : '—'}</span></div>
          <div className="eq-info-row"><span>{t('profile.member_since')}</span><span>{user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : '—'}</span></div>
        </div>
      </div>

      {/* Change Password */}
      <div className="eq-info-panel" style={{ marginTop: '1.25rem' }}>
        <h3>{t('profile.change_password')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.75rem' }}>
          <div className="eq-field">
            <label>{t('profile.current_password')}</label>
            <input type="password" className="eq-input" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="••••••••" />
          </div>
          <div className="eq-field">
            <label>{t('profile.new_password')}</label>
            <input type="password" className="eq-input" value={passwordForm.newPassword} onChange={(e) => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="••••••••" />
          </div>
          <div className="eq-field">
            <label>{t('profile.confirm_password')}</label>
            <input type="password" className="eq-input" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="••••••••" />
          </div>

          {passwordError && <p style={{ color: '#dc2626', fontSize: '0.88rem', margin: 0 }}>{passwordError}</p>}
          {passwordMsg && <p style={{ color: '#16a34a', fontSize: '0.88rem', margin: 0 }}>{passwordMsg}</p>}

          <div>
            <button className="eq-btn-save" onClick={handlePasswordChange}>{t('profile.save_password')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
