const TOKEN_KEY = 'token'
const USER_KEY = 'user'
const VENDOR_ID_KEY = 'vendorId'

function roleTokenKey(role) {
  return `token_${role}`
}

export function setCurrentSession(role, token, user) {
  // Namespace tokens by role for isolation
  if (role && token) {
    localStorage.setItem(roleTokenKey(role), token)
  }

  // Set current active session
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    // Store vendorId separately for easy access
    if (user.vendorId) {
      localStorage.setItem(VENDOR_ID_KEY, user.vendorId)
    }
  }
}

export function getCurrentSession() {
  const token = localStorage.getItem(TOKEN_KEY)
  try {
    const raw = localStorage.getItem(USER_KEY)
    const user = raw ? JSON.parse(raw) : null
    return { token, user }
  } catch {
    return { token, user: null }
  }
}

export function clearCurrentSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(VENDOR_ID_KEY)
}

export function getRoleToken(role) {
  return localStorage.getItem(roleTokenKey(role)) || null
}

export function getVendorId() {
  return localStorage.getItem(VENDOR_ID_KEY) || null
}

