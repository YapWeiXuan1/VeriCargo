import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getSession, logoutUser } from '../services/axiosClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    setLoading(true)
    try {
      const sessionUser = await getSession()
      setUser(sessionUser)
      return sessionUser
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Delete authentication data left by versions that used browser storage.
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem('token')
      storage.removeItem('user')
      storage.removeItem('role')
    }
    const rememberPreference = sessionStorage.getItem('vericargo_remember')
    if (rememberPreference === '0') {
      // The user requested a one-view session: a reload ends it.
      sessionStorage.removeItem('vericargo_remember')
      logoutUser().catch(() => {}).finally(() => setLoading(false))
    } else {
      void refreshSession()
    }
  }, [refreshSession])
  useEffect(() => {
    const clear = () => { setUser(null); setLoading(false) }
    window.addEventListener('vericargo:unauthorized', clear)
    return () => window.removeEventListener('vericargo:unauthorized', clear)
  }, [])

  const logout = useCallback(async () => {
    try { await logoutUser() } finally {
      sessionStorage.removeItem('vericargo_remember')
      setUser(null)
    }
  }, [])

  const value = useMemo(() => ({ user, loading, setUser, refreshSession, logout }), [user, loading, refreshSession, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
