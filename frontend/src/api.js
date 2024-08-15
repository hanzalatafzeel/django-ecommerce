const API_BASE = '/api/v1'
const TOKEN_KEY = 'ecom_access'
const REFRESH_KEY = 'ecom_refresh'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setTokens = ({ access, refresh }) => {
  localStorage.setItem(TOKEN_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
}
export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

async function tryRefresh() {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) return false
  try {
    const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return false
    const data = await res.json()
    setTokens({ access: data.access })
    return true
  } catch {
    return false
  }
}

export async function api(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  let res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401 && auth && retry && (await tryRefresh())) {
    return api(path, { method, body, auth, retry: false })
  }
  if (res.status === 204) return null
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const err = new Error((data && (data.detail || data.error)) || res.statusText)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}