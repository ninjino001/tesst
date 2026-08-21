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

export function fetchDashboardStats() {
  return fetch('/api/dashboard/stats/', {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}

export function fetchSensorLatest(equipmentRef) {
  return fetch(`/api/sensors/equipment/${equipmentRef}/latest/`, {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}

export function fetchSensorReadings(sensorId, params = {}) {
  const query = new URLSearchParams()
  if (params.hours) query.append('hours', params.hours)
  if (params.days) query.append('days', params.days)
  const queryString = query.toString()
  const url = queryString
    ? `/api/sensors/${sensorId}/readings/?${queryString}`
    : `/api/sensors/${sensorId}/readings/`
  return fetch(url, {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}


export function createSensor(payload) {
  return fetch('/api/sensors/', {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then(handleResponse)
}
