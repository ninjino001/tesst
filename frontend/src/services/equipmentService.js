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

export function fetchEquipment(params = {}) {
  const query = new URLSearchParams()
  if (params.status) query.append('status', params.status)
  if (params.criticality) query.append('criticality', params.criticality)
  if (params.category) query.append('category', params.category)
  if (params.search) query.append('search', params.search)
  const queryString = query.toString()
  const url = queryString ? `/api/equipment/?${queryString}` : '/api/equipment/'
  return fetch(url, {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}

export function fetchEquipmentDetail(reference) {
  return fetch(`/api/equipment/${reference}/`, {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}

export function createEquipment(payload) {
  return fetch('/api/equipment/', {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then(handleResponse)
}

export function updateEquipment(reference, payload) {
  return fetch(`/api/equipment/${reference}/`, {
    method: 'PUT',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then(handleResponse)
}

export function deleteEquipment(reference) {
  return fetch(`/api/equipment/${reference}/`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Unable to delete equipment')
    }
    return response.text()
  })
}

export function fetchEquipmentStats() {
  return fetch('/api/equipment/stats/', {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}

export function fetchCategories() {
  return fetch('/api/equipment/categories/', {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}
