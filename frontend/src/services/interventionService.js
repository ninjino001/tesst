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
        if (json.detail) {
          error = json.detail
        } else if (json.error) {
          error = json.error
        } else {
          // DRF validation errors: {"field": ["error msg"]}
          const messages = Object.entries(json).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          if (messages.length > 0) error = messages.join(' | ')
        }
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

export function fetchInterventions(params = {}) {
  const query = new URLSearchParams()
  if (params.status) query.append('status', params.status)
  if (params.priority) query.append('priority', params.priority)
  if (params.type) query.append('type', params.type)
  if (params.search) query.append('search', params.search)
  const queryString = query.toString()
  const url = queryString ? `/api/interventions/?${queryString}` : '/api/interventions/'
  return fetch(url, {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}

export function fetchInterventionDetail(reference) {
  return fetch(`/api/interventions/${reference}/`, {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}

export function createIntervention(payload) {
  return fetch('/api/interventions/', {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then(handleResponse)
}

export function updateIntervention(reference, payload) {
  return fetch(`/api/interventions/${reference}/`, {
    method: 'PUT',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then(handleResponse)
}

export function fetchInterventionStats() {
  return fetch('/api/interventions/stats/', {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}

export function fetchMyInterventions() {
  return fetch('/api/interventions/my/', {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}

export function startIntervention(reference) {
  return fetch(`/api/interventions/${reference}/start/`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
  }).then(handleResponse)
}

export function closeIntervention(reference, report) {
  return fetch(`/api/interventions/${reference}/close/`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify({ report }),
  }).then(handleResponse)
}
