import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import useWallet from '../hooks/useWallet'

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user')) ?? undefined } catch { return undefined }
}

function AppLayout({ title, subtitle, actions, children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const { disconnect } = useWallet()
  const user = getStoredUser() || { fullName: 'VeriCargo User', role: 'User' }
  const displayName = user.fullName || user.name || 'VeriCargo User'
  const initials = displayName.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => {
    const closeMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('role')
    disconnect()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <Sidebar user={getStoredUser()} />

      <main className="app-main">
        <div className="app-topbar">
          <div className="app-topbar__title">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="app-topbar__actions">
            <button type="button" className="icon-btn" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </button>
            <button type="button" className="icon-btn" aria-label="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 01-3.4 0" />
              </svg>
            </button>
            {actions}
            <div className="account-menu" ref={menuRef}>
              <button type="button" className="account-menu__trigger" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Open account menu">
                <span className="account-menu__avatar">{initials}</span>
              </button>
              {menuOpen && <div className="account-menu__popover" role="menu">
                <div className="account-menu__identity"><strong>{displayName}</strong><span>{user.role || 'User'}</span></div>
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/profile') }}><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3" /><path d="M5 20c.8-3.2 3.1-5 7-5s6.2 1.8 7 5" /></svg>Profile</button>
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/profile', { state: { openPassword: true } }) }}><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>Reset password</button>
                <button type="button" role="menuitem" onClick={handleLogout}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 00-2-2h-6" /></svg>Log out</button>
              </div>}
            </div>
          </div>
        </div>

        {children}
      </main>
    </div>
  )
}

export default AppLayout
