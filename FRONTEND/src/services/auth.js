import { getCurrentSession } from './session'

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api`

export async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  })
  if (!response.ok) {
    throw new Error('Login failed')
  }
  return await response.json()
}

export async function validateToken(token) {
  const response = await fetch(`${API_BASE_URL}/auth/validate-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
  if (!response.ok) {
    throw new Error('Token validation failed')
  }
  return await response.json()
}

export function getAuthHeader() {
  const { token } = getCurrentSession()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
