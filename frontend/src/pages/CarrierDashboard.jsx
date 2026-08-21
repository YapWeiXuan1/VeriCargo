import '../styles/main.css'
import '../styles/dashboard.css'
import AppLayout from '../components/AppLayout'
import { ContractNote, PageState, StatusPill, WalletAction } from '../components/AgreementUI'
import { useState } from 'react'
import useAgreements from '../hooks/useAgreements'
import { Link } from 'react-router-dom'

function CarrierDashboard() {
  const data = useAgreements('carrier'); const [now] = useState(() => Date.now() / 1000)
  const active = data.agreements.filter((a) => a.status === 1 || a.status === 2)
  const ready = active.filter((a) => a.nextProofIndex < a.milestones.length || a.milestones.some((m) => m.rejected)).length
  const claimable = active.filter((a) => a.milestones.some((m) => m.index === a.nextVerificationIndex && m.proofSubmittedAt && !m.verified && !m.rejected && now > m.proofSubmittedAt + 259200)).length
  const stats = [{ label: 'Active agreements', value: active.length, note: 'Assigned to this wallet' }, { label: 'Ready for proof', value: ready, note: 'New or rejected milestone' }, { label: 'Timeout claims', value: claimable, note: 'Review window elapsed' }, { label: 'Payments released', value: `${data.agreements.reduce((sum, a) => sum + Number(a.releasedEth), 0).toFixed(3)} ETH`, note: 'Verified milestones' }]
  return <AppLayout title="Carrier dashboard" subtitle="A live summary of assigned escrow work." actions={<><WalletAction /><Link className="btn btn--primary" to="/carrier/proofs">Submit proof</Link></>}><ContractNote /><PageState loading={data.loading} error={data.error} connected={data.isConnected} />
    <div className="stat-grid">{stats.map((s) => <div className="card stat-card" key={s.label}><div className="stat-card__label">{s.label}</div><div className="stat-card__value">{s.value}</div><div className="stat-card__delta stat-card__delta--up">{s.note}</div></div>)}</div>
    <div className="dash-grid"><div className="card"><div className="panel-header"><div><h2>Assigned agreements</h2><p>Current escrow commitments</p></div><Link className="panel-link" to="/carrier/agreements">View all</Link></div><table className="ship-table"><thead><tr><th>ID</th><th>Value</th><th>Milestones</th><th>Released</th><th>Status</th></tr></thead><tbody>{active.slice(-5).reverse().map((a) => <tr key={a.id}><td className="ship-table__id">#{a.id}</td><td>{a.totalEth} ETH</td><td>{a.verifiedMilestoneCount}/{a.milestones.length}</td><td>{a.releasedEth} ETH</td><td><StatusPill status={a.status} /></td></tr>)}</tbody></table>{!active.length && <p className="muted-copy">No active agreements.</p>}</div>
    <div className="card"><div className="panel-header"><div><h2>Next actions</h2><p>Contract functions grouped by workflow</p></div></div><div className="quick-links"><Link to="/carrier/proofs">Submit milestone proof <span>→</span></Link><Link to="/carrier/claims">Check timeout claims <span>→</span></Link><Link to="/carrier/history">Open agreement history <span>→</span></Link></div></div></div>
  </AppLayout>
}
export default CarrierDashboard
