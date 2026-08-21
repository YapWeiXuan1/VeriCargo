import '../styles/main.css'
import '../styles/dashboard.css'
import AppLayout from '../components/AppLayout'
import { ContractNote, PageState, StatusPill, WalletAction } from '../components/AgreementUI'
import useAgreements from '../hooks/useAgreements'
import { Link } from 'react-router-dom'

function ShipperDashboard() {
  const data = useAgreements('shipper')
  const active = data.agreements.filter((a) => a.status === 1 || a.status === 2)
  const stats = [
    { label: 'Active agreements', value: active.length, note: 'Funded or in progress' },
    { label: 'Proofs to review', value: active.filter((a) => a.pendingProofCount > 0).length, note: 'Within the 3-day window' },
    { label: 'Completed', value: data.agreements.filter((a) => a.status === 3).length, note: 'Settled on-chain' },
    { label: 'Agreement value', value: `${data.agreements.reduce((sum, a) => sum + Number(a.totalEth), 0).toFixed(3)} ETH`, note: 'Across this wallet' },
  ]
  return <AppLayout title="Shipper dashboard" subtitle="A live summary of your Sepolia escrow activity." actions={<><WalletAction /><Link className="btn btn--primary" to="/shipper/agreements">New agreement</Link></>}>
    <ContractNote /><PageState loading={data.loading} error={data.error} connected={data.isConnected} />
    <div className="stat-grid">{stats.map((s) => <div className="card stat-card" key={s.label}><div className="stat-card__label">{s.label}</div><div className="stat-card__value">{s.value}</div><div className="stat-card__delta stat-card__delta--up">{s.note}</div></div>)}</div>
    <div className="dash-grid"><div className="card"><div className="panel-header"><div><h2>Active agreements</h2><p>Your most immediate escrow work</p></div><Link className="panel-link" to="/shipper/agreements">View all</Link></div>
      <table className="ship-table"><thead><tr><th>ID</th><th>Value</th><th>Milestones</th><th>Pending proofs</th><th>Status</th></tr></thead><tbody>{active.slice(-5).reverse().map((a) => <tr key={a.id}><td className="ship-table__id">#{a.id}</td><td>{a.totalEth} ETH</td><td>{a.verifiedMilestoneCount}/{a.milestones.length}</td><td>{a.pendingProofCount}</td><td><StatusPill status={a.status} /></td></tr>)}</tbody></table>{!active.length && <p className="muted-copy">No active agreements.</p>}
    </div><div className="card"><div className="panel-header"><div><h2>Next actions</h2><p>Contract functions grouped by workflow</p></div></div><div className="quick-links"><Link to="/shipper/review">Review submitted proofs <span>→</span></Link><Link to="/shipper/funds">Fund or refund agreements <span>→</span></Link><Link to="/shipper/history">Open agreement history <span>→</span></Link></div></div></div>
  </AppLayout>
}
export default ShipperDashboard
