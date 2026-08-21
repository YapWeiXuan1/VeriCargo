// src/utils/auth.js
export const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}

export const getUser = () => {
  try {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const getUserRole = () => {
  return getUser()?.role?.toLowerCase() || null
}

export const isLoggedIn = () => {
  return !!getToken()
}