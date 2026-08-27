import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../context/auth'
import useWallet from '../hooks/useWallet'

function AppLayout({ title, subtitle, actions, children }) {
  const navigate = useNavigate()
  const menuRef = useRef(null)
  const closeTimerRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const { disconnect } = useWallet()

  const openMenu = () => {
    clearTimeout(closeTimerRef.current)
    setMenuOpen(true)
  }
  const scheduleMenuClose = () => {
    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => setMenuOpen(false), 180)
  }

  useEffect(() => {
    const close = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      clearTimeout(closeTimerRef.current)
    }
  }, [])

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    disconnect()
    navigate('/login', { replace: true })
  }

  return <div className="app-shell app-shell--hybrid">
    <header className="system-bar">
      <Link className="system-brand" to="/dashboard" aria-label="VeriCargo dashboard"><span className="system-brand__icon" aria-hidden="true">VC</span><span>VeriCargo</span></Link>
      <div className="profile-menu" ref={menuRef} onMouseEnter={openMenu} onMouseLeave={scheduleMenuClose}>
        <button className="profile-button" type="button" onFocus={openMenu} aria-haspopup="menu" aria-expanded={menuOpen}>
          <span className="profile-button__avatar">{(user?.fullName || 'U').slice(0, 1).toUpperCase()}</span><span>Profile</span>
        </button>
        {menuOpen && <div className="profile-menu__dropdown" role="menu">
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/profile') }}>Profile</button>
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); navigate('/wallet') }}>Wallet</button>
          <button className="profile-menu__logout" type="button" role="menuitem" onClick={handleLogout}>Log out</button>
        </div>}
      </div>
    </header>
    <div className="app-layout-body"><Sidebar user={user} /><div className="app-workspace"><main className="app-main app-main--hybrid">
      <div className="app-topbar"><div className="app-topbar__title"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="app-topbar__actions">{actions}</div>}</div>
      {children}
    </main></div></div>
  </div>
}

export default AppLayout
