import '../styles/main.css'
import '../styles/dashboard.css'
import AppLayout from '../components/AppLayout'

const stats = [
  {
    label: 'Assigned Agreements',
    value: '12',
    delta: '+2 this week',
    up: true,
  },
  {
    label: 'Pending Proof',
    value: '5',
    delta: 'Awaiting submission',
    up: true,
  },
  {
    label: 'Completed Agreements',
    value: '21',
    delta: '+4 this month',
    up: true,
  },
  {
    label: 'Payments Received',
    value: '8.75 ETH',
    delta: 'Released milestones',
    up: true,
  },
]

const agreements = [
  {
    id: '#001',
    shipper: 'ABC Trading',
    milestone: 'Goods Loaded',
    status: 'Pending Proof',
    payment: '1 ETH',
  },
  {
    id: '#002',
    shipper: 'Global Export',
    milestone: 'Arrived at Port',
    status: 'Verified',
    payment: '2 ETH',
  },
  {
    id: '#003',
    shipper: 'Ocean Logistics',
    milestone: 'Custom Clearance',
    status: 'In Progress',
    payment: '0.5 ETH',
  },
]

const activity = [
  {
    text: 'Milestone #2 verified by shipper.',
    time: '1 hour ago',
  },
  {
    text: 'Payment of 2 ETH released.',
    time: 'Yesterday',
  },
  {
    text: 'New agreement assigned.',
    time: '2 days ago',
  },
]

function CarrierDashboard() {
  return (
    <AppLayout
      title="Welcome back, Carrier"
      subtitle="Manage your assigned agreements and milestone submissions."
      actions={
        <button className="btn btn--primary">
          Submit Proof
        </button>
      }
    >
      <div className="stat-grid">
        {stats.map((item) => (
          <div className="card stat-card" key={item.label}>
            <div className="stat-card__label">
              {item.label}
            </div>

            <div className="stat-card__value">
              {item.value}
            </div>

            <div
              className={`stat-card__delta ${
                item.up
                  ? 'stat-card__delta--up'
                  : 'stat-card__delta--down'
              }`}
            >
              {item.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="panel-header">
            <div>
              <h2>Assigned Agreements</h2>
              <p>Current agreements assigned to you</p>
            </div>
          </div>

          <table className="ship-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Shipper</th>
                <th>Current Milestone</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>

            <tbody>
              {agreements.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.shipper}</td>
                  <td>{item.milestone}</td>
                  <td>{item.status}</td>
                  <td>{item.payment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="panel-header">
            <div>
              <h2>Recent Activity</h2>
              <p>Latest blockchain events</p>
            </div>
          </div>

          <div className="activity-list">
            {activity.map((item, index) => (
              <div className="activity-item" key={index}>
                <div className="activity-item__body">
                  <p>{item.text}</p>
                  <span>{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default CarrierDashboard