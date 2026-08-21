import React from 'react'
import { useLanguage } from '../contexts/LanguageContext'

function LanguageSwitcher() {
  const { lang, setLang } = useLanguage()
  const buttonStyle = (active) => ({
    background: active ? '#eff6ff' : 'transparent',
    color: active ? '#1d4ed8' : '#334155',
    border: '1px solid rgba(15,23,42,0.12)',
    padding: '6px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 700,
  })

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button onClick={() => setLang('fr')} style={buttonStyle(lang === 'fr')}>FR</button>
      <button onClick={() => setLang('en')} style={buttonStyle(lang === 'en')}>EN</button>
    </div>
  )
}

export default LanguageSwitcher
