import '../styles/main.css'
import '../styles/dashboard.css'
import AppLayout from '../components/AppLayout'

const stats = [
  { label: 'Active shipments', value: '18', delta: '+3 this week', up: true, icon: 'box' },
  { label: 'In transit', value: '7', delta: '+1 today', up: true, icon: 'truck' },
  { label: 'Delivered', value: '142', delta: '+12 this month', up: true, icon: 'check' },
  { label: 'Pending pickup', value: '4', delta: '-2 vs last week', up: false, icon: 'clock' },
]

const statIcons = {
  box: <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />,
  truck: <path d="M1 3h13v13H1zM14 8h4l3 3v5h-7V8zM5 19a2 2 0 100-4 2 2 0 000 4zM17.5 19a2 2 0 100-4 2 2 0 000 4z" />,
  check: <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />,
  clock: <path d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2" />,
}

const shipments = [
  { id: 'VC-4821', origin: 'Shenzhen', destination: 'Rotterdam', carrier: 'Maersk Line', status: 'transit', eta: 'Aug 12' },
  { id: 'VC-4820', origin: 'Ningbo', destination: 'Los Angeles', carrier: 'OceanBridge', status: 'pending', eta: 'Aug 15' },
  { id: 'VC-4817', origin: 'Ho Chi Minh', destination: 'Hamburg', carrier: 'MSC', status: 'delivered', eta: 'Aug 3' },
  { id: 'VC-4812', origin: 'Busan', destination: 'Long Beach', carrier: 'Evergreen', status: 'issue', eta: 'Delayed' },
  { id: 'VC-4809', origin: 'Klang', destination: 'Felixstowe', carrier: 'CMA CGM', status: 'transit', eta: 'Aug 18' },
]

const statusLabel = {
  transit: 'In transit',
  pending: 'Pending',
  delivered: 'Delivered',
  issue: 'Delayed',
}

const activity = [
  { text: 'Shipment VC-4821 departed Shenzhen port', time: '2 hours ago', tone: 'transit' },
  { text: 'Customs cleared for VC-4817 in Hamburg', tone: 'delivered', time: '5 hours ago' },
  { text: 'Carrier flagged a delay on VC-4812', tone: 'issue', time: 'Yesterday' },
  { text: 'New quote received from CMA CGM for VC-4809', tone: 'pending', time: 'Yesterday' },
]

const activityIcon = {
  transit: <path d="M5 12h14M13 6l6 6-6 6" />,
  delivered: <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />,
  issue: <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />,
  pending: <path d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2" />,
}

function ShipperDashboard() {
  return (
    <AppLayout
      title="Welcome back, Alex"
      subtitle="Here's what's moving across your supply chain today."
      actions={
        <button type="button" className="btn btn--primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New shipment
        </button>
      }
    >
      <div className="stat-grid">
        {stats.map((s) => (
          <div className="card stat-card" key={s.label}>
            <div className="stat-card__label">
              {s.label}
              <span className="stat-card__icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {statIcons[s.icon]}
                </svg>
              </span>
            </div>
            <div className="stat-card__value">{s.value}</div>
            <div className={`stat-card__delta ${s.up ? 'stat-card__delta--up' : 'stat-card__delta--down'}`}>
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="panel-header">
            <div>
              <h2>Recent shipments</h2>
              <p>Your most recently updated cargo</p>
            </div>
            <a className="panel-link" href="/shipments">View all</a>
          </div>

          <table className="ship-table">
            <thead>
              <tr>
                <th>Shipment</th>
                <th>Route</th>
                <th>Carrier</th>
                <th>Status</th>
                <th>ETA</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id}>
                  <td className="ship-table__id">{s.id}</td>
                  <td>
                    <span className="ship-table__route">
                      {s.origin}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                      {s.destination}
                    </span>
                  </td>
                  <td>{s.carrier}</td>
                  <td>
                    <span className={`status-pill status-pill--${s.status}`}>{statusLabel[s.status]}</span>
                  </td>
                  <td>{s.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="panel-header">
            <div>
              <h2>Activity</h2>
              <p>Latest updates across your account</p>
            </div>
          </div>

          <div className="activity-list">
            {activity.map((a, i) => (
              <div className="activity-item" key={i}>
                <span
                  className="activity-item__dot"
                  style={{
                    background: `var(--status-${a.tone}-bg)`,
                    color: `var(--status-${a.tone})`,
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {activityIcon[a.tone]}
                  </svg>
                </span>
                <div className="activity-item__body">
                  <p>{a.text}</p>
                  <span>{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default ShipperDashboard