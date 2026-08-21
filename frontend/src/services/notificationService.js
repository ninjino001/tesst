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
      } catch (err) {}
      throw new Error(error)
    })
  }
  return response.json()
}

export function fetchNotifications() {
  return fetch('/api/alerts/notifications/', {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}

export function markNotificationsRead(ids) {
  return fetch('/api/alerts/notifications/mark-read/', {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify({ ids }),
  }).then(handleResponse)
}

export function markAllNotificationsRead() {
  return fetch('/api/alerts/notifications/mark-all-read/', {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
  }).then(handleResponse)
}
