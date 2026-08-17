import Sidebar from './Sidebar'

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user')) ?? undefined } catch { return undefined }
}

function AppLayout({ title, subtitle, actions, children }) {
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
          </div>
        </div>

        {children}
      </main>
    </div>
  )
}

export default AppLayout
