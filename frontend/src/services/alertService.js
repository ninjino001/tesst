const defaultHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

function getCsrfToken() {
  const match = document.cookie.match(/csrftoken=([^;]+)/)
  return match ? match[1] : null
}

function authHeaders() {
  const headers = { ...defaultHeaders }
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken
  }
  return headers
}

function handleResponse(response) {
  if (!response.ok) {
    return response.text().then((body) => {
      let error = 'API request failed'
      try {
        const json = JSON.parse(body)
        error = json.detail || json.error || error
      } catch (err) {
        // keep default error message
      }
      throw new Error(error)
    })
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text().then((body) => {
    try {
      return JSON.parse(body)
    } catch (err) {
      throw new Error('API response was not valid JSON')
    }
  })
}

export function fetchAlerts(params = {}) {
  const query = new URLSearchParams()
  if (params.status) query.append('status', params.status)
  if (params.level) query.append('level', params.level)
  if (params.search) query.append('search', params.search)
  const queryString = query.toString()
  const url = queryString ? `/api/alerts/?${queryString}` : '/api/alerts/'
  return fetch(url, {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}

export function fetchAlertDetail(reference) {
  return fetch(`/api/alerts/${reference}/`, {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}

export function fetchAlertStats() {
  return fetch('/api/alerts/stats/', {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}

export function acknowledgeAlert(reference) {
  return fetch(`/api/alerts/${reference}/acknowledge/`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
  }).then(handleResponse)
}

export function resolveAlert(reference) {
  return fetch(`/api/alerts/${reference}/resolve/`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
  }).then(handleResponse)
}
