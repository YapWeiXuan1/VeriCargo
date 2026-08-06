import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const navSections = [
  {
    label: 'Overview',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
      { to: '/shipments', label: 'Shipments', icon: 'box', badge: 3 },
      { to: '/tracking', label: 'Live tracking', icon: 'map-pin' },
    ],
  },
  {
    label: 'Manage',
    links: [
      { to: '/carriers', label: 'Carriers', icon: 'truck' },
      { to: '/documents', label: 'Documents', icon: 'file' },
      { to: '/payments', label: 'Payments', icon: 'wallet' },
    ],
  },
  {
    label: 'Account',
    links: [
      { to: '/company', label: 'Company profile', icon: 'building' },
      { to: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
]

const icons = {
  grid: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />,
  box: <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />,
  'map-pin': <path d="M12 21s7-6.5 7-11.5A7 7 0 105 9.5C5 14.5 12 21 12 21zM12 11a2 2 0 100-4 2 2 0 000 4z" />,
  truck: <path d="M1 3h13v13H1zM14 8h4l3 3v5h-7V8zM5 19a2 2 0 100-4 2 2 0 000 4zM17.5 19a2 2 0 100-4 2 2 0 000 4z" />,
  file: <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6" />,
  wallet: <path d="M21 7H4a1 1 0 00-1 1v9a2 2 0 002 2h16a1 1 0 001-1V8a1 1 0 00-1-1zM3 7V5a2 2 0 012-2h11 M17 13h1" />,
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

function Sidebar({ user = { name: 'Alex Morgan', role: 'Shipper' } }) {
  const [collapsed, setCollapsed] = useState(false)

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">VC</div>
        {!collapsed && <span className="sidebar__brand-name">VeriCargo</span>}
        <button
          type="button"
          className="sidebar__collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
          </svg>
        </button>
      </div>

      <nav className="sidebar__nav">
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed && <div className="sidebar__section-label">{section.label}</div>}
            {section.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `sidebar__link ${isActive ? 'is-active' : ''}`}
                title={collapsed ? link.label : undefined}
              >
                <Icon name={link.icon} />
                {!collapsed && <span>{link.label}</span>}
                {!collapsed && link.badge && <span className="sidebar__link-badge">{link.badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__avatar">{initials}</div>
        {!collapsed && (
          <div>
            <div className="sidebar__user-name">{user.name}</div>
            <div className="sidebar__user-role">{user.role}</div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar