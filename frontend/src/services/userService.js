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

export function fetchUsers() {
  return fetch('/api/users/', {
    credentials: 'include',
    headers: defaultHeaders,
  }).then(handleResponse)
}

export function createUser(payload) {
  return fetch('/api/users/', {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then(handleResponse)
}

export function updateUser(id, payload) {
  return fetch(`/api/users/${id}/`, {
    method: 'PUT',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then(handleResponse)
}

export function deleteUser(id) {
  return fetch(`/api/users/${id}/`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Unable to delete user')
    }
    return response.text()
  })
}
