const API_BASE = '/api'

const defaultHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
}

async function handleResponse(res) {
  const text = await res.text().catch(() => '')
  if (!res.ok) {
    if (!text) return Promise.reject({ error: res.statusText })
    try { return Promise.reject(JSON.parse(text)) } catch { return Promise.reject({ error: text }) }
  }
  if (!text) return undefined
  try { return JSON.parse(text) } catch { return text }
}

function getCsrf() {
  const m = document.cookie.match(/csrftoken=([^;]+)/)
  return m ? m[1] : null
}

export const authService = {
  login: async (username, password) => {
    const headers = { ...defaultHeaders }
    const body = JSON.stringify({ username, password })
    const opts = { method: 'POST', credentials: 'include', headers, body }
    const response = await fetch(`${API_BASE}/auth/login/`, opts)
    const data = await handleResponse(response)
    await authService.me().catch(() => null)
    return data
  },

  logout: () => {
    const headers = { ...defaultHeaders }
    const csrf = getCsrf()
    if (csrf) headers['X-CSRFToken'] = csrf
    return fetch(`${API_BASE}/auth/logout/`, { method: 'POST', credentials: 'include', headers }).then(handleResponse)
  },

  me: () => {
    return fetch(`${API_BASE}/auth/me/`, { method: 'GET', credentials: 'include' }).then(handleResponse)
  },
}

export default authService
