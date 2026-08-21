import { useLanguage } from '../contexts/LanguageContext'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

function LoginPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError(t('auth.fill_fields') || 'Please fill in both fields')
      return
    }

    setSubmitting(true)
    try {
      const u = await login(email.trim(), password)
      if (u) {
        navigate('/app/dashboard', { replace: true })
      } else {
        setError(t('auth.invalid_credentials') || 'Invalid credentials')
      }
    } catch (err) {
      const message = err?.error || err?.detail || err?.message || 'Login failed'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <div className="login-page-root">
      <div className="login-card">
        <Link to="/" className="login-logo-link" aria-label={t('nav.home') || 'Home'}>
          <div className="login-logos">
            <img src="/Airports-morocco.png" alt="Airports of Morocco" className="login-logo-aom" />
            <div className="login-logo-spacer" />
            <img src="/logo.png" alt="AIMOS" className="login-logo-aimos" />
          </div>
        </Link>
        <form onSubmit={handleSubmit} className="login-form">
        <div>
          <label className="field-label text-white" htmlFor="email">{t('auth.email')}</label>
          <input id="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.email')} className="login-input" />
        </div>
        <div>
          <label className="field-label text-white" htmlFor="password">{t('auth.password')}</label>
          <input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('auth.password')} className="login-input" />
        </div>
        {error && <div className="form-error" style={{ color: '#f8b4b4', fontSize: '0.9rem' }}>{error}</div>}
        <button type="submit" disabled={submitting} className="login-button">
          {submitting ? (t('auth.loading') || 'Connexion...') : (t('auth.login_button'))}
        </button>
      </form>
      </div>
    </div>
  )
}

export default LoginPage
