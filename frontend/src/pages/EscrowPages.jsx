import { useState } from 'react'
import { parseEther } from 'ethers'
import AppLayout from '../components/AppLayout'
import { ContractNote, PageState, StatusPill, WalletAction } from '../components/AgreementUI'
import useAgreements from '../hooks/useAgreements'
import { dateTime, escrowActions, shortAddress } from '../services/escrowService'
import '../styles/main.css'
import '../styles/dashboard.css'

function useTransaction(refresh) {
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const run = async (key, action) => {
    setBusy(key); setMessage('Confirm the transaction in MetaMask…')
    try { await action(); setMessage('Transaction confirmed on Sepolia.'); await refresh() }
    catch (err) { setMessage(err.shortMessage || err.reason || err.message || 'Transaction failed.') }
    finally { setBusy('') }
  }
  return { busy, message, run }
}

function Page({ title, subtitle, children }) {
  return <AppLayout title={title} subtitle={subtitle} actions={<WalletAction />}><ContractNote />{children}</AppLayout>
}

function AgreementTable({ agreements, role, actions }) {
  return <div className="card table-card"><table className="ship-table"><thead><tr><th>Agreement</th><th>{role === 'carrier' ? 'Shipper' : 'Carrier'}</th><th>Value</th><th>Progress</th><th>Deadline</th><th>Status</th>{actions && <th>Action</th>}</tr></thead><tbody>
    {agreements.map((a) => <tr key={a.id}><td className="ship-table__id">#{a.id}</td><td>{shortAddress(role === 'carrier' ? a.shipper : a.carrier)}</td><td>{a.totalEth} ETH</td><td>{a.verifiedMilestoneCount}/{a.milestones.length}</td><td>{dateTime(a.deadline)}</td><td><StatusPill status={a.status} /></td>{actions && <td>{actions(a)}</td>}</tr>)}
  </tbody></table></div>
}

export function ShipperAgreements() {
  const data = useAgreements('shipper')
  const tx = useTransaction(data.refresh)
  const [form, setForm] = useState({ carrier: '', value: '', deadline: '', descriptions: 'Pickup\nDelivery', percentages: '30\n70' })
  const create = (event) => {
    event.preventDefault()
    const descriptions = form.descriptions.split('\n').map((v) => v.trim()).filter(Boolean)
    const percentages = form.percentages.split('\n').map(Number)
    tx.run('create', () => escrowActions.create(form.carrier, parseEther(form.value), Math.floor(new Date(form.deadline).getTime() / 1000), descriptions, percentages))
  }
  return <Page title="Agreements" subtitle="Create escrow terms and review your active shipping agreements.">
    <div className="function-grid"><form className="card contract-form" onSubmit={create}><div className="panel-header"><div><h2>Create agreement</h2><p>Milestone percentages must total 100.</p></div></div>
      <label>Carrier wallet<input required value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} placeholder="0x…" /></label>
      <div className="form-row"><label>Total value (ETH)<input required type="number" min="0" step="any" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></label><label>Proof deadline<input required type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label></div>
      <div className="form-row"><label>Milestones (one per line)<textarea required rows="4" value={form.descriptions} onChange={(e) => setForm({ ...form, descriptions: e.target.value })} /></label><label>Percentages (one per line)<textarea required rows="4" value={form.percentages} onChange={(e) => setForm({ ...form, percentages: e.target.value })} /></label></div>
      <button className="btn btn--primary" disabled={!data.isConnected || tx.busy}>Create on Sepolia</button>{tx.message && <p className="form-message">{tx.message}</p>}
    </form></div>
    <PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!data.agreements.length} />{data.agreements.length > 0 && <AgreementTable agreements={data.agreements.filter((a) => a.status < 3)} role="shipper" />}
  </Page>
}

export function ShipperReview() {
  const data = useAgreements('shipper'); const tx = useTransaction(data.refresh)
  const items = data.agreements.flatMap((a) => a.milestones.filter((m) => m.index === a.nextVerificationIndex && m.proofSubmittedAt && !m.verified && !m.rejected).map((m) => ({ a, m })))
  return <Page title="Review proofs" subtitle="Approve or reject the next sequential milestone within its three-day review window."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!items.length} />
    <div className="item-grid">{items.map(({ a, m }) => <article className="card action-card" key={`${a.id}-${m.index}`}><span className="card-kicker">Agreement #{a.id} · Milestone {m.index + 1}</span><h2>{m.description}</h2><p>{m.percent}% release · submitted {dateTime(m.proofSubmittedAt)}</p><p>Review deadline: {dateTime(m.proofSubmittedAt + 259200)}</p><div className="button-row"><button className="btn btn--primary" disabled={tx.busy} onClick={() => tx.run(`v-${a.id}`, () => escrowActions.verify(a.id, m.index))}>Verify & release</button><button className="btn btn--secondary" disabled={tx.busy} onClick={() => tx.run(`r-${a.id}`, () => escrowActions.reject(a.id, m.index))}>Reject proof</button></div></article>)}</div>{tx.message && <p className="form-message">{tx.message}</p>}
  </Page>
}

export function ShipperFunds() {
  const data = useAgreements('shipper'); const tx = useTransaction(data.refresh); const [now] = useState(() => Date.now() / 1000)
  return <Page title="Funding & refunds" subtitle="Fund pending agreements or recover unreleased escrow after the deadline."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!data.agreements.length} />
    {data.agreements.length > 0 && <AgreementTable agreements={data.agreements.filter((a) => a.status < 3)} role="shipper" actions={(a) => a.status === 0 ? <button className="btn btn--compact btn--primary" disabled={tx.busy} onClick={() => tx.run(`f-${a.id}`, () => escrowActions.fund(a.id, a.totalValue))}>Fund {a.totalEth} ETH</button> : (a.deadline < now && a.pendingProofCount === 0 && a.fundedAmount > a.releasedAmount && a.status < 3) ? <button className="btn btn--compact btn--secondary" disabled={tx.busy} onClick={() => tx.run(`refund-${a.id}`, () => escrowActions.refund(a.id))}>Refund remainder</button> : <span className="muted-copy">No action available</span>} />}{tx.message && <p className="form-message">{tx.message}</p>}
  </Page>
}

export function CarrierAgreements() { const data = useAgreements('carrier'); return <Page title="Assigned agreements" subtitle="Review escrow terms, milestones, values, and delivery deadlines."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!data.agreements.length} />{data.agreements.length > 0 && <AgreementTable agreements={data.agreements.filter((a) => a.status < 3)} role="carrier" />}</Page> }

export function CarrierProofs() {
  const data = useAgreements('carrier'); const tx = useTransaction(data.refresh); const [proofs, setProofs] = useState({}); const [now] = useState(() => Date.now() / 1000)
  const items = data.agreements.flatMap((a) => a.milestones.filter((m) => a.status > 0 && a.status < 3 && a.deadline >= now && !m.verified && (m.index === a.nextProofIndex || m.rejected)).map((m) => ({ a, m })))
  return <Page title="Submit proof" subtitle="Submit sequential milestone hashes or replace a proof rejected by the shipper."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!items.length} /><div className="item-grid">{items.map(({ a, m }) => <article className="card action-card" key={`${a.id}-${m.index}`}><span className="card-kicker">Agreement #{a.id} · {m.rejected ? 'Resubmission' : `Milestone ${m.index + 1}`}</span><h2>{m.description}</h2><p>{m.percent}% of {a.totalEth} ETH</p><label>Proof reference or bytes32 hash<input value={proofs[`${a.id}-${m.index}`] || ''} onChange={(e) => setProofs({ ...proofs, [`${a.id}-${m.index}`]: e.target.value })} placeholder="Document CID, tracking reference, or 0x hash" /></label><button className="btn btn--primary" disabled={tx.busy || !proofs[`${a.id}-${m.index}`]} onClick={() => tx.run(`p-${a.id}`, () => escrowActions.submitProof(a.id, m.index, proofs[`${a.id}-${m.index}`]))}>Submit proof hash</button></article>)}</div>{tx.message && <p className="form-message">{tx.message}</p>}</Page>
}

export function CarrierClaims() {
  const data = useAgreements('carrier'); const tx = useTransaction(data.refresh); const [now] = useState(() => Date.now() / 1000)
  const items = data.agreements.flatMap((a) => a.milestones.filter((m) => m.index === a.nextVerificationIndex && m.proofSubmittedAt && !m.verified && !m.rejected && now > m.proofSubmittedAt + 259200).map((m) => ({ a, m })))
  return <Page title="Timeout claims" subtitle="Claim milestone payment when the three-day shipper review period has elapsed."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!items.length} /><div className="item-grid">{items.map(({ a, m }) => <article className="card action-card" key={`${a.id}-${m.index}`}><span className="card-kicker">Agreement #{a.id}</span><h2>{m.description}</h2><p>The review window ended {dateTime(m.proofSubmittedAt + 259200)}.</p><button className="btn btn--primary" disabled={tx.busy} onClick={() => tx.run(`c-${a.id}`, () => escrowActions.claim(a.id, m.index))}>Claim {m.percent}% payment</button></article>)}</div>{tx.message && <p className="form-message">{tx.message}</p>}</Page>
}

export function AgreementHistory({ role }) { const data = useAgreements(role); const history = data.agreements.filter((a) => a.status >= 3); return <Page title="Agreement history" subtitle="Completed and refunded agreements recorded by the deployed escrow contract."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!history.length} />{history.length > 0 && <AgreementTable agreements={history} role={role} />}</Page> }
