import React, { createContext, useContext, useState, useMemo } from 'react'
import translations from '../i18n/translations'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('fr')

  const t = (key) => {
    if (!key) return ''
    const parts = key.split('.')
    let node = translations[lang]
    for (const p of parts) {
      if (!node) return key
      node = node[p]
    }
    return node || key
  }

  const value = useMemo(() => ({ lang, setLang, t }), [lang])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

export default LanguageContext
