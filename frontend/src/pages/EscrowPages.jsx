import { useEffect, useState } from 'react'
import { parseEther } from 'ethers'
import AppLayout from '../components/AppLayout'
import { ContractNote, PageState, StatusPill, WalletAction } from '../components/AgreementUI'
import useAgreements from '../hooks/useAgreements'
import { dateTime, escrowActions, shortAddress } from '../services/escrowService'
import { getProofImageUrl, searchCarriers, uploadProofImage } from '../services/axiosClient'
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

function ProofImage({ proofHash, agreementId, milestoneIndex }) {
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let objectUrl = ''
    let active = true

    const loadProof = async () => {
      try {
        const signedUrl = await getProofImageUrl(proofHash, agreementId, milestoneIndex)
        const buffer = await fetch(signedUrl).then((response) => {
          if (!response.ok) throw new Error('Unable to download proof image.')
          return response.arrayBuffer()
        })
        const digest = await crypto.subtle.digest('SHA-256', buffer)
        const actualHash = `0x${Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('')}`
        if (actualHash !== proofHash.toLowerCase()) throw new Error('Proof image hash does not match the on-chain hash.')
        objectUrl = URL.createObjectURL(new Blob([buffer]))
        if (active) setImageUrl(objectUrl)
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to verify proof image.')
      }
    }

    if (proofHash) void loadProof()
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [proofHash, agreementId, milestoneIndex])

  if (error) return <p className="form-message form-message--error">{error}</p>
  if (!imageUrl) return <p className="muted-copy">Loading and verifying proof image…</p>
  return <img className="proof-image" src={imageUrl} alt="Carrier submitted proof" />
}

function AgreementTable({ agreements, role, actions, footer }) {
  return <div className="card table-card"><table className="ship-table"><thead><tr><th>Agreement</th><th>{role === 'carrier' ? 'Shipper' : 'Carrier'}</th><th>Value</th><th>Progress</th><th>Deadline</th><th>Status</th>{actions && <th>Action</th>}</tr></thead><tbody>
    {agreements.map((a) => <tr key={a.id}><td className="ship-table__id">#{a.id}</td><td>{shortAddress(role === 'carrier' ? a.shipper : a.carrier)}</td><td>{a.totalEth} ETH</td><td>{a.verifiedMilestoneCount}/{a.milestones.length}</td><td>{dateTime(a.deadline)}</td><td><StatusPill status={a.status} /></td>{actions && <td>{actions(a)}</td>}</tr>)}
  </tbody></table>{footer}</div>
}

export function ShipperAgreements() {
  const data = useAgreements('shipper')
  const tx = useTransaction(data.refresh)
  const [form, setForm] = useState({ carrier: '', value: '', deadline: '' })
  const [milestones, setMilestones] = useState([
    { description: 'Pickup', percentage: '30' },
    { description: 'Delivery', percentage: '70' },
  ])
  const [carrierSearch, setCarrierSearch] = useState('')
  const [carrierResults, setCarrierResults] = useState([])
  const [selectedCarrier, setSelectedCarrier] = useState(null)
  const [carrierError, setCarrierError] = useState('')
  const [carrierSearchOpen, setCarrierSearchOpen] = useState(false)
  const [minimumDeadline] = useState(() => new Date(Date.now() + 60000).toISOString().slice(0, 16))
  const [formError, setFormError] = useState('')

  useEffect(() => {
    let active = true
    const query = carrierSearch.trim()
    if (!carrierSearchOpen) {
      return () => { active = false }
    }
    const timer = setTimeout(async () => {
      try {
        const carriers = await searchCarriers(query)
        if (active) {
          setCarrierResults(carriers)
          setCarrierError(carriers.length ? '' : 'No verified carrier wallets found.')
        }
      } catch (error) {
        if (active) setCarrierError(error.response?.data?.message || 'Unable to search carriers.')
      }
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [carrierSearch, carrierSearchOpen])

  const create = (event) => {
    event.preventDefault()
    if (!selectedCarrier) { setFormError('Select a verified carrier first.'); return }
    const descriptions = milestones.map((milestone) => milestone.description.trim())
    const percentages = milestones.map((milestone) => Number(milestone.percentage))
    if (descriptions.some((description) => !description) || percentages.some((percentage) => !Number.isFinite(percentage) || percentage <= 0) || percentages.reduce((sum, percentage) => sum + percentage, 0) !== 100) {
      setFormError('Each milestone needs a description and a positive percentage. Percentages must total 100.')
      return
    }
    setFormError('')
    tx.run('create', () => escrowActions.create(form.carrier, parseEther(form.value), Math.floor(new Date(form.deadline).getTime() / 1000), descriptions, percentages))
  }
  const updateMilestone = (index, field, value) => setMilestones((current) => current.map((milestone, milestoneIndex) => milestoneIndex === index ? { ...milestone, [field]: value } : milestone))
  const addMilestone = () => setMilestones((current) => [...current, { description: '', percentage: '' }])
  const removeMilestone = (index) => setMilestones((current) => current.length > 1 ? current.filter((_, milestoneIndex) => milestoneIndex !== index) : current)
  return <Page title="Agreements" subtitle="Create escrow terms and review your active shipping agreements.">
    <div className="function-grid"><form className="card contract-form" onSubmit={create}><div className="panel-header"><div><h2>Create agreement</h2><p>Milestone percentages must total 100.</p></div></div>
      <div className="carrier-field"><span>Carrier wallet</span><div className="carrier-select"><button className="carrier-select__trigger" type="button" aria-expanded={carrierSearchOpen} aria-controls="carrier-options" onClick={() => { setCarrierSearch(''); setCarrierSearchOpen((open) => !open) }}>{selectedCarrier ? selectedCarrier.walletAddress : 'Choose a verified carrier'}<span aria-hidden="true">⌄</span></button>{carrierSearchOpen && <div className="carrier-select__menu"><input autoFocus value={carrierSearch} onChange={(e) => { setCarrierSearch(e.target.value); setSelectedCarrier(null); setForm({ ...form, carrier: '' }) }} placeholder="Search company, email, or wallet" />{carrierError && <p className="form-message form-message--error">{carrierError}</p>}{carrierResults.length > 0 && <div className="carrier-results" id="carrier-options" role="listbox">{carrierResults.map((carrier) => <button className="carrier-result" role="option" type="button" key={carrier.id} onClick={() => { setSelectedCarrier(carrier); setCarrierSearch(''); setCarrierResults([]); setCarrierSearchOpen(false); setForm({ ...form, carrier: carrier.walletAddress }) }}><strong>{carrier.walletAddress}</strong><span>{carrier.companyName}</span><small>{carrier.email}</small></button>)}</div>}</div>}</div></div>
      <div className="form-row"><label>Company name<input readOnly value={selectedCarrier?.companyName || ''} placeholder="Select a carrier" /></label><label>Company email<input readOnly value={selectedCarrier?.email || ''} placeholder="Select a carrier" /></label></div>
      <div className="form-row"><label>Total value (ETH)<input required type="number" min="0" step="any" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></label><label>Proof deadline<input required className="deadline-input" type="datetime-local" min={minimumDeadline} value={form.deadline} onClick={(event) => event.currentTarget.showPicker?.()} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label></div>
      <section className="milestone-editor"><div className="milestone-editor__heading"><div><h3>Milestones</h3><p>Add one row for each delivery step. Percentages must total 100.</p></div><button className="btn btn--secondary btn--compact" type="button" onClick={addMilestone}>Add milestone</button></div>{milestones.map((milestone, index) => <div className="milestone-row" key={index}><span className="milestone-row__number">{index + 1}</span><label>Description<input required value={milestone.description} onChange={(event) => updateMilestone(index, 'description', event.target.value)} placeholder="e.g. Pickup confirmed" /></label><label>Release %<input required type="number" min="1" max="100" value={milestone.percentage} onChange={(event) => updateMilestone(index, 'percentage', event.target.value)} /></label><button className="btn btn--secondary btn--compact" type="button" disabled={milestones.length === 1} onClick={() => removeMilestone(index)}>Remove</button></div>)}</section>
      {formError && <p className="form-message form-message--error">{formError}</p>}
      <button className="btn btn--primary" disabled={!data.isConnected || tx.busy || !selectedCarrier}>Create on Sepolia</button>{tx.message && <p className="form-message">{tx.message}</p>}
    </form></div>
    <PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!data.agreements.length} />{data.agreements.length > 0 && <PaginatedAgreementTable agreements={data.agreements.filter((a) => a.status < 3)} role="shipper" pageSize={5} />}
  </Page>
}

export function ShipperReview() {
  const data = useAgreements('shipper'); const tx = useTransaction(data.refresh)
  const items = data.agreements.flatMap((a) => a.milestones.filter((m) => m.index === a.nextVerificationIndex && m.proofSubmittedAt && !m.verified && !m.rejected).map((m) => ({ a, m })))
  return <Page title="Review proofs" subtitle="Approve or reject the next sequential milestone within its three-day review window."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!items.length} />
    <div className="item-grid">{items.map(({ a, m }) => <article className="card action-card" key={`${a.id}-${m.index}`}><span className="card-kicker">Agreement #{a.id} · Milestone {m.index + 1}</span><h2>{m.description}</h2><p>{m.percent}% release · submitted {dateTime(m.proofSubmittedAt)}</p><p>Review deadline: {dateTime(m.proofSubmittedAt + 259200)}</p><ProofImage proofHash={m.proofHash} agreementId={a.id} milestoneIndex={m.index} /><div className="button-row"><button className="btn btn--primary" disabled={tx.busy} onClick={() => tx.run(`v-${a.id}`, () => escrowActions.verify(a.id, m.index))}>Verify & release</button><button className="btn btn--secondary" disabled={tx.busy} onClick={() => tx.run(`r-${a.id}`, () => escrowActions.reject(a.id, m.index))}>Reject proof</button></div></article>)}</div>{tx.message && <p className="form-message">{tx.message}</p>}
  </Page>
}

export function ShipperFunds() {
  const data = useAgreements('shipper'); const tx = useTransaction(data.refresh); const [now] = useState(() => Date.now() / 1000)
  return <Page title="Funding & refunds" subtitle="Fund pending agreements or recover unreleased escrow after the deadline."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!data.agreements.length} />
    {data.agreements.length > 0 && <PaginatedAgreementTable agreements={data.agreements.filter((a) => a.status < 3)} role="shipper" actions={(a) => a.status === 0 ? <button className="btn btn--compact btn--primary" disabled={tx.busy} onClick={() => tx.run(`f-${a.id}`, () => escrowActions.fund(a.id, a.totalValue))}>Fund {a.totalEth} ETH</button> : (a.deadline < now && a.pendingProofCount === 0 && a.fundedAmount > a.releasedAmount && a.status < 3) ? <button className="btn btn--compact btn--secondary" disabled={tx.busy} onClick={() => tx.run(`refund-${a.id}`, () => escrowActions.refund(a.id))}>Refund remainder</button> : <span className="muted-copy">No action available</span>} />}{tx.message && <p className="form-message">{tx.message}</p>}
  </Page>
}

export function CarrierAgreements() { const data = useAgreements('carrier'); return <Page title="Assigned agreements" subtitle="Review escrow terms, milestones, values, and delivery deadlines."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!data.agreements.length} />{data.agreements.length > 0 && <PaginatedAgreementTable agreements={data.agreements.filter((a) => a.status < 3)} role="carrier" pageSize={5} />}</Page> }

export function CarrierProofs() {
  const data = useAgreements('carrier')
  const tx = useTransaction(data.refresh)
  const [proofs, setProofs] = useState({})
  const [proofHashes, setProofHashes] = useState({})
  const [now] = useState(() => Date.now() / 1000)
  const items = data.agreements.flatMap((a) => a.milestones.filter((m) => a.status > 0 && a.status < 3 && a.deadline >= now && !m.verified && (m.index === a.nextProofIndex || m.rejected)).map((m) => ({ a, m })))
  const proofKey = (agreementId, milestoneIndex) => `${agreementId}-${milestoneIndex}`

  return <Page title="Submit proof" subtitle="Upload an image, review it, then submit its SHA-256 hash on Sepolia."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!items.length} /><div className="item-grid">{items.map(({ a, m }) => {
    const key = proofKey(a.id, m.index)
    const proof = proofs[key]
    return <article className="card action-card" key={key}><span className="card-kicker">Agreement #{a.id} · {m.rejected ? 'Resubmission' : `Milestone ${m.index + 1}`}</span><h2>{m.description}</h2><p>{m.percent}% of {a.totalEth} ETH</p><label>Proof image<input required accept="image/jpeg,image/png,image/webp" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) setProofs({ ...proofs, [key]: { file, preview: URL.createObjectURL(file) } }) }} /></label>{proof && <><img className="proof-image" src={proof.preview} alt="Proof selected for submission" /><p className="muted-copy">{proof.file.name}</p></>}{proofHashes[key] && <p className="muted-copy">SHA-256: {proofHashes[key]}</p>}<button className="btn btn--primary" disabled={tx.busy || !proof} onClick={() => tx.run(`p-${a.id}`, async () => { const uploaded = await uploadProofImage(proof.file, a.id, m.index); setProofHashes({ ...proofHashes, [key]: uploaded.proofHash }); return escrowActions.submitProof(a.id, m.index, uploaded.proofHash) })}>Hash image & submit proof</button></article>
  })}</div>{tx.message && <p className="form-message">{tx.message}</p>}</Page>
}

function PaginatedAgreementTable({ agreements, role, actions, pageSize = 20 }) {
  const [page, setPage] = useState(1)
  const ordered = [...agreements].sort((a, b) => b.id - a.id)
  const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize))
  const visible = ordered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])
  const footer = <div className="payment-pagination table-pagination"><span>Showing {visible.length} of {ordered.length} agreements</span><div><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
  return <AgreementTable agreements={visible} role={role} actions={actions} footer={footer} />
}

export function CarrierClaims() {
  const data = useAgreements('carrier'); const tx = useTransaction(data.refresh); const [now] = useState(() => Date.now() / 1000)
  const items = data.agreements.flatMap((a) => a.milestones.filter((m) => m.index === a.nextVerificationIndex && m.proofSubmittedAt && !m.verified && !m.rejected && now > m.proofSubmittedAt + 259200).map((m) => ({ a, m })))
  return <Page title="Timeout claims" subtitle="Claim milestone payment when the three-day shipper review period has elapsed."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!items.length} /><div className="item-grid">{items.map(({ a, m }) => <article className="card action-card" key={`${a.id}-${m.index}`}><span className="card-kicker">Agreement #{a.id}</span><h2>{m.description}</h2><p>The review window ended {dateTime(m.proofSubmittedAt + 259200)}.</p><button className="btn btn--primary" disabled={tx.busy} onClick={() => tx.run(`c-${a.id}`, () => escrowActions.claim(a.id, m.index))}>Claim {m.percent}% payment</button></article>)}</div>{tx.message && <p className="form-message">{tx.message}</p>}</Page>
}

export function AgreementHistory({ role }) { const data = useAgreements(role); const history = data.agreements.filter((a) => a.status >= 3); return <Page title="Agreement history" subtitle="Completed and refunded agreements recorded by the deployed escrow contract."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!history.length} />{history.length > 0 && <PaginatedAgreementTable agreements={history} role={role} />}</Page> }
