import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const icons = {
  grid: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />,
  box: <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />,
  'map-pin': <path d="M12 21s7-6.5 7-11.5A7 7 0 105 9.5C5 14.5 12 21 12 21zM12 11a2 2 0 100-4 2 2 0 000 4z" />,
  truck: <path d="M1 3h13v13H1zM14 8h4l3 3v5h-7V8zM5 19a2 2 0 100-4 2 2 0 000 4zM17.5 19a2 2 0 100-4 2 2 0 000 4z" />,
  file: <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6" />,
  wallet: <path d="M21 7H4a1 1 0 00-1 1v9a2 2 0 002 2h16a1 1 0 001-1V8a1 1 0 00-1-1zM3 7V5a2 2 0 012-2h11 M17 13h1" />,
  clock: <path d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2" />,
  building: <path d="M3 21h18M6 21V5a1 1 0 011-1h6a1 1 0 011 1v16M6 9h1M6 13h1M11 9h1M11 13h1M14 21v-6h5a1 1 0 011 1v5" />,
  settings: <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.66.28 1.51.99 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />,
}

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}

function Sidebar({ user = { name: 'Alex Morgan', role: 'Shipper' }, open = false, onNavigate }) {
  const { pathname } = useLocation()
  const [agreementsOpen, setAgreementsOpen] = useState(false)
  const agreementsActive = pathname === '/shipper/agreements' || pathname.startsWith('/shipper/agreements/')
  const agreementsExpanded = agreementsActive || agreementsOpen
  const currentUser = user || { name: 'VeriCargo User', role: 'User' }
  const dashboardPath = currentUser.role?.toLowerCase() === 'carrier' ? '/carrierdashboard' : '/shipperdashboard'
  const isCarrier = currentUser.role?.toLowerCase() === 'carrier'
  const navSections = [
    { label: 'Overview', links: [{ to: dashboardPath, label: 'Dashboard', icon: 'grid' }] },
    isCarrier
      ? { label: 'Escrow workflow', links: [
          { to: '/carrier/agreements', label: 'Assigned agreements', icon: 'file' },
          { to: '/carrier/proofs', label: 'Submit proof', icon: 'box' },
          { to: '/carrier/claims', label: 'Timeout claims', icon: 'clock' },
          { to: '/carrier/history', label: 'History', icon: 'wallet' },
        ] }
      : { label: 'Escrow workflow', links: [
          { to: '/shipper/agreements', label: 'Agreements', icon: 'file' },
          { to: '/shipper/review', label: 'Review proofs', icon: 'box' },
          { to: '/shipper/funds', label: 'Funding & refunds', icon: 'wallet' },
          { to: '/shipper/history', label: 'History', icon: 'clock' },
        ] },
    { label: 'Account', links: [{ to: '/wallet', label: 'Wallet', icon: 'wallet' }, { to: '/settings', label: 'Settings', icon: 'settings' }] },
  ]

  return (
    <aside id="mobile-sidebar" className={`sidebar ${open ? 'is-open sidebar--mobile-open' : ''}`}>
      <nav className="sidebar__nav">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="sidebar__section-label">{section.label}</div>
            {section.links.map((link) => link.to === '/shipper/agreements' ? (
              <div key={link.to}>
                <button
                  type="button"
                  className="sidebar__link sidebar__toggle"
                  aria-expanded={agreementsExpanded}
                  aria-controls="shipper-agreements-submenu"
                  onClick={() => setAgreementsOpen((expanded) => !expanded)}
                >
                  <Icon name={link.icon} />
                  <span>{link.label}</span>
                  <svg className="sidebar__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={agreementsExpanded ? 'M6 15l6-6 6 6' : 'M9 6l6 6-6 6'} /></svg>
                </button>
                <div id="shipper-agreements-submenu" className="sidebar__submenu" hidden={!agreementsExpanded}>
                  {[{ to: '/shipper/agreements', label: 'My Agreements' }, { to: '/shipper/agreements/create', label: 'Create Agreement' }].map((item) => (
                    <NavLink key={item.to} to={item.to} end className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`} onClick={onNavigate}>{item.label}</NavLink>
                  ))}
                </div>
              </div>
            ) : (
              <NavLink
                key={link.to}
                to={link.to === '/dashboard' ? dashboardPath : link.to}
                className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
                onClick={onNavigate}
              >
                <Icon name={link.icon} />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

    </aside>
  )
}

export default Sidebar
