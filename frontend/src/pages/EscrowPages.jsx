import { Fragment, useEffect, useState } from 'react'
import { parseEther } from 'ethers'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { ContractNote, PageState, StatusPill, WalletAction } from '../components/AgreementUI'
import useAgreements from '../hooks/useAgreements'
import { dateTime, escrowActions, shortAddress } from '../services/escrowService'
import { getProofImageUrl, searchCarriers, uploadProofImage } from '../services/axiosClient'
import { Popup } from '../components/Popup'
import MilestoneStepper from '../components/MilestoneStepper'
import '../styles/main.css'
import '../styles/dashboard.css'

function useTransaction(refresh) {
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const run = async (key, action) => {
    setBusy(key); setMessage('Confirm the transaction in MetaMask…')
    window.dispatchEvent(new CustomEvent('vericargo:transaction-lock', { detail: { locked: true, message: 'Confirm the transaction in MetaMask, then wait for Sepolia confirmation.' } }))
    setError(false)
    try { await action(); setMessage('Transaction confirmed on Sepolia.'); await refresh(); return true }
    catch (err) { setError(true); setMessage(err.shortMessage || err.reason || err.message || 'Transaction failed.'); return false }
    finally { setBusy(''); window.dispatchEvent(new CustomEvent('vericargo:transaction-lock', { detail: { locked: false } })) }
  }
  const clearMessage = () => { setMessage(''); setError(false) }
  return { busy, message, error, run, clearMessage }
}

function Page({ title, subtitle, children }) {
  return <AppLayout title={title} subtitle={subtitle} actions={<WalletAction />}><ContractNote />{children}</AppLayout>
}

function ProofImage({ proofHash, agreementId, milestoneIndex, onReadyChange }) {
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let objectUrl = ''
    let active = true

    const loadProof = async () => {
      onReadyChange?.(false)
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
        if (active) { setImageUrl(objectUrl); onReadyChange?.(true) }
      } catch (loadError) {
        if (active) { setError(loadError.message || 'Unable to verify proof image.'); onReadyChange?.(false) }
      }
    }

    if (proofHash) void loadProof()
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [proofHash, agreementId, milestoneIndex, onReadyChange])

  if (error) return <p className="form-message form-message--error">{error}</p>
  if (!imageUrl) return <div className="inline-loading"><span className="state-spinner" aria-hidden="true" /><span>Loading and verifying proof image…</span></div>
  return <img className="proof-image" src={imageUrl} alt="Carrier submitted proof" />
}

function AgreementTable({ agreements, role, actions, footer, onSelect, selectedId, panelId }) {
  return <div className="card table-card"><table className="ship-table"><thead><tr><th>Agreement</th><th>{role === 'carrier' ? 'Shipper' : 'Carrier'}</th><th>Value</th><th>Progress</th><th>Deadline</th><th>Status</th>{actions && <th>Action</th>}{onSelect && <th><span className="agreement-row__sr">Progress details</span></th>}</tr></thead><tbody>
    {agreements.map((a) => <Fragment key={a.id}><tr className={onSelect ? `agreement-row ${selectedId === a.id ? 'is-selected' : ''}` : undefined} onClick={onSelect ? () => onSelect(a.id) : undefined}><td className="ship-table__id">#{a.id}</td><td>{shortAddress(role === 'carrier' ? a.shipper : a.carrier)}</td><td>{a.totalEth} ETH</td><td>{a.verifiedMilestoneCount}/{a.milestones.length}</td><td>{dateTime(a.deadline)}</td><td><StatusPill status={a.status} /></td>{actions && <td>{actions(a)}</td>}{onSelect && <td><button type="button" className="agreement-row__toggle" aria-label={`Progress for agreement ${a.id}`} aria-expanded={selectedId === a.id} aria-controls={`${panelId}-${a.id}`} onClick={(event) => { event.stopPropagation(); onSelect(a.id) }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button></td>}</tr>
      {onSelect && <tr className="agreement-detail-row"><td colSpan={actions ? 8 : 7}>
        <div id={`${panelId}-${a.id}`} className={`agreement-expansion ${selectedId === a.id ? 'is-expanded' : ''}`} inert={selectedId !== a.id} aria-hidden={selectedId !== a.id}>
          <div className="agreement-expansion__inner"><MilestoneStepper agreement={a} /></div>
        </div>
      </td></tr>}
    </Fragment>)}
  </tbody></table>{footer}</div>
}

export function ShipperAgreements() {
  const data = useAgreements('shipper')
  return <Page title="My Agreements" subtitle="Review your active shipping agreements.">
    <div className="panel-header"><h2>Active agreements</h2><Link className="btn btn--primary" to="/shipper/agreements/create">Create agreement</Link></div>
    <PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!data.agreements.length} />{data.agreements.length > 0 && <PaginatedAgreementTable agreements={data.agreements.filter((a) => a.status < 3)} role="shipper" pageSize={5} expandable />}
  </Page>
}

export function ShipperCreateAgreement() {
  const navigate = useNavigate()
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
  const [fieldErrors, setFieldErrors] = useState({})
  const [showFundingReminder, setShowFundingReminder] = useState(false)

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

  const create = async (event) => {
    event.preventDefault()
    const descriptions = milestones.map((milestone) => milestone.description.trim())
    const percentages = milestones.map((milestone) => Number(milestone.percentage))
    const errors = {}
    if (!selectedCarrier) errors.carrier = 'Select a verified carrier.'
    if (!form.value || !Number.isFinite(Number(form.value)) || Number(form.value) <= 0) errors.value = 'Enter an ETH value greater than 0.'
    if (!form.deadline) errors.deadline = 'Choose a proof deadline.'
    else if (new Date(form.deadline).getTime() <= Date.now()) errors.deadline = 'The deadline must be in the future.'
    descriptions.forEach((description, index) => { if (!description) errors[`description-${index}`] = 'Enter a milestone description.' })
    percentages.forEach((percentage, index) => { if (!Number.isFinite(percentage) || percentage <= 0) errors[`percentage-${index}`] = 'The release must be greater than 0%.' })
    if (percentages.reduce((sum, percentage) => sum + (Number.isFinite(percentage) ? percentage : 0), 0) !== 100) errors[`percentage-${milestones.length - 1}`] = 'Milestone releases must total exactly 100%.'
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    const created = await tx.run('create', () => escrowActions.create(form.carrier, parseEther(form.value), Math.floor(new Date(form.deadline).getTime() / 1000), descriptions, percentages))
    if (created) setShowFundingReminder(true)
  }
  const updateMilestone = (index, field, value) => { setFieldErrors((current) => ({ ...current, [`${field}-${index}`]: '' })); setMilestones((current) => {
    const next = current.map((milestone, milestoneIndex) => milestoneIndex === index ? { ...milestone, [field]: value } : milestone)
    if (field === 'percentage' && index < next.length - 1) {
      const used = next.slice(0, -1).reduce((sum, milestone) => sum + Math.max(0, Number(milestone.percentage) || 0), 0)
      next[next.length - 1] = { ...next[next.length - 1], percentage: String(Math.max(0, 100 - used)) }
    }
    return next
  }) }
  const addMilestone = () => setMilestones((current) => {
    const count = current.length + 1
    const equal = Math.floor(100 / count)
    return [...current, { description: '', percentage: '' }].map((milestone, index) => ({ ...milestone, percentage: String(index === count - 1 ? 100 - equal * (count - 1) : equal) }))
  })
  const removeMilestone = (index) => setMilestones((current) => {
    if (current.length === 1) return current
    const next = current.filter((_, milestoneIndex) => milestoneIndex !== index)
    const used = next.slice(0, -1).reduce((sum, milestone) => sum + Math.max(0, Number(milestone.percentage) || 0), 0)
    next[next.length - 1] = { ...next[next.length - 1], percentage: String(Math.max(0, 100 - used)) }
    return next
  })
  return <Page title="Create Agreement" subtitle="Create escrow terms for a new shipping agreement.">
    <div className="function-grid"><form className="card contract-form" onSubmit={create} noValidate><div className="panel-header"><div><h2>Create agreement</h2><p>Milestone percentages must total 100.</p></div></div>
      <div className="carrier-field"><span>Carrier wallet</span><div className="carrier-select"><button className="carrier-select__trigger" data-error={Boolean(fieldErrors.carrier)} type="button" aria-expanded={carrierSearchOpen} aria-controls="carrier-options" onClick={() => { setCarrierSearch(''); setCarrierSearchOpen((open) => !open) }}>{selectedCarrier ? selectedCarrier.walletAddress : 'Choose a verified carrier'}<span aria-hidden="true">⌄</span></button>{carrierSearchOpen && <div className="carrier-select__menu"><input autoFocus value={carrierSearch} onChange={(e) => { setCarrierSearch(e.target.value); setSelectedCarrier(null); setForm({ ...form, carrier: '' }) }} placeholder="Search company, email, or wallet" />{carrierError && <p className="field-error">{carrierError}</p>}{carrierResults.length > 0 && <div className="carrier-results" id="carrier-options" role="listbox">{carrierResults.map((carrier) => <button className="carrier-result" role="option" type="button" key={carrier.id} onClick={() => { setSelectedCarrier(carrier); setFieldErrors((current) => ({ ...current, carrier: '' })); setCarrierSearch(''); setCarrierResults([]); setCarrierSearchOpen(false); setForm({ ...form, carrier: carrier.walletAddress }) }}><strong>{carrier.walletAddress}</strong><span>{carrier.companyName}</span><small>{carrier.email}</small></button>)}</div>}</div>}</div>{fieldErrors.carrier && <p className="field-error">{fieldErrors.carrier}</p>}</div>
      <div className="form-row"><label>Company name<input readOnly value={selectedCarrier?.companyName || ''} placeholder="Select a carrier" /></label><label>Company email<input readOnly value={selectedCarrier?.email || ''} placeholder="Select a carrier" /></label></div>
      <div className="form-row"><label>Total value (ETH)<input aria-invalid={Boolean(fieldErrors.value)} type="number" min="0" step="any" value={form.value} onChange={(e) => { setForm({ ...form, value: e.target.value }); setFieldErrors((current) => ({ ...current, value: '' })) }} />{fieldErrors.value && <span className="field-error">{fieldErrors.value}</span>}</label><label>Proof deadline<input aria-invalid={Boolean(fieldErrors.deadline)} className="deadline-input" type="datetime-local" min={minimumDeadline} value={form.deadline} onClick={(event) => event.currentTarget.showPicker?.()} onChange={(e) => { setForm({ ...form, deadline: e.target.value }); setFieldErrors((current) => ({ ...current, deadline: '' })) }} />{fieldErrors.deadline && <span className="field-error">{fieldErrors.deadline}</span>}</label></div>
      <section className="milestone-editor"><div className="milestone-editor__heading"><div><h3>Milestones</h3><p>Change any percentage except the last one; the final milestone automatically balances the total to 100%.</p></div><button className="btn btn--secondary btn--compact" type="button" onClick={addMilestone}>Add milestone</button></div><div className="milestone-editor__list">{milestones.map((milestone, index) => <div className="milestone-item" key={index}><div className="milestone-row"><span className="milestone-row__number">{index + 1}</span><label>Description<input aria-invalid={Boolean(fieldErrors[`description-${index}`])} value={milestone.description} onChange={(event) => updateMilestone(index, 'description', event.target.value)} placeholder="e.g. Pickup confirmed" /></label><label>{index === milestones.length - 1 ? 'Release % (auto)' : 'Release %'}<input aria-invalid={Boolean(fieldErrors[`percentage-${index}`])} readOnly={index === milestones.length - 1} type="number" min="0" max="100" value={milestone.percentage} onChange={(event) => updateMilestone(index, 'percentage', event.target.value)} /></label><button className="btn btn--secondary btn--compact" type="button" disabled={milestones.length === 1} onClick={() => removeMilestone(index)}>Remove</button></div>{(fieldErrors[`description-${index}`] || fieldErrors[`percentage-${index}`]) && <div className="milestone-errors" role="alert"><span>{fieldErrors[`description-${index}`]}</span><span>{fieldErrors[`percentage-${index}`]}</span></div>}</div>)}</div></section>
      <button className="btn btn--primary" disabled={!data.isConnected || tx.busy}>Create on Sepolia</button>{tx.message && <p className={`form-message ${tx.error ? 'form-message--error' : ''}`}>{tx.message}</p>}
    </form></div>
    <PageState loading={data.loading} error={data.error} connected={data.isConnected} />
    {showFundingReminder && <Popup variant="success" title="Agreement created—fund it next" message="The agreement is recorded but remains pending until you fund the escrow. Go to Funding & refunds now to activate it." actionLabel="Go to funding" onAction={() => { setShowFundingReminder(false); navigate('/shipper/funds') }} onClose={() => setShowFundingReminder(false)} />}
  </Page>
}

// eslint-disable-next-line no-unused-vars
function ShipperReviewLegacy() {
  const data = useAgreements('shipper'); const tx = useTransaction(data.refresh)
  const items = data.agreements.flatMap((a) => a.milestones.filter((m) => m.index === a.nextVerificationIndex && m.proofSubmittedAt && !m.verified && !m.rejected).map((m) => ({ a, m })))
  return <Page title="Review proofs" subtitle="Approve or reject the next sequential milestone within its three-day review window."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!items.length} />
    <div className="item-grid">{items.map(({ a, m }) => <article className="card action-card" key={`${a.id}-${m.index}`}><span className="card-kicker">Agreement #{a.id} · Milestone {m.index + 1}</span><h2>{m.description}</h2><p>{m.percent}% release · submitted {dateTime(m.proofSubmittedAt)}</p><p>Review deadline: {dateTime(m.proofSubmittedAt + 259200)}</p><ProofImage proofHash={m.proofHash} agreementId={a.id} milestoneIndex={m.index} /><div className="button-row"><button className="btn btn--primary" disabled={tx.busy} onClick={() => tx.run(`v-${a.id}`, () => escrowActions.verify(a.id, m.index))}>Verify & release</button><button className="btn btn--secondary" disabled={tx.busy} onClick={() => tx.run(`r-${a.id}`, () => escrowActions.reject(a.id, m.index))}>Reject proof</button></div></article>)}</div>{tx.message && <p className="form-message">{tx.message}</p>}
  </Page>
}

function WorkflowModal({ title, onClose, children }) {
  return <div className="workflow-modal__backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="workflow-modal" role="dialog" aria-modal="true" aria-label={title}><button className="workflow-modal__close" type="button" onClick={onClose} aria-label="Close">×</button><h2>{title}</h2>{children}</section></div>
}

export function ShipperReview() {
  const data = useAgreements('shipper'); const tx = useTransaction(data.refresh)
  const [selected, setSelected] = useState(null)
  const [proofReady, setProofReady] = useState(false)
  const items = data.agreements.flatMap((a) => a.milestones.filter((m) => m.index === a.nextVerificationIndex && m.proofSubmittedAt && !m.verified && !m.rejected).map((m) => ({ a, m })))
  const act = async (key, action) => { if (await tx.run(key, action)) setSelected(null) }
  return <Page title="Review proofs" subtitle="Select a submitted milestone to inspect its proof and make a decision."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!items.length} />
    {items.length > 0 && <div className="card table-card workflow-table"><table className="ship-table"><thead><tr><th>Agreement</th><th>Milestone</th><th>Release</th><th>Submitted</th><th>Deadline</th><th /></tr></thead><tbody>{items.map(({ a, m }) => <tr key={`${a.id}-${m.index}`}><td className="ship-table__id">#{a.id}</td><td>{m.description}</td><td>{m.percent}%</td><td>{dateTime(m.proofSubmittedAt)}</td><td>{dateTime(m.proofSubmittedAt + 259200)}</td><td><button className="btn btn--compact btn--secondary" type="button" onClick={() => { tx.clearMessage(); setProofReady(false); setSelected({ a, m }) }}>View proof</button></td></tr>)}</tbody></table></div>}
    {tx.message && <p className={`form-message ${tx.error ? 'form-message--error' : ''}`}>{tx.message}</p>}
    {selected && <WorkflowModal title={`Agreement #${selected.a.id} · Milestone ${selected.m.index + 1}`} onClose={() => { setSelected(null); setProofReady(false) }}><div className="workflow-detail"><span className="card-kicker">{selected.m.percent}% release</span><h3>{selected.m.description}</h3><p>Submitted: {dateTime(selected.m.proofSubmittedAt)}</p><p>Review deadline: {dateTime(selected.m.proofSubmittedAt + 259200)}</p><ProofImage proofHash={selected.m.proofHash} agreementId={selected.a.id} milestoneIndex={selected.m.index} onReadyChange={setProofReady} /><div className="button-row workflow-actions"><button className="btn btn--primary" disabled={tx.busy || !proofReady} onClick={() => act(`v-${selected.a.id}`, () => escrowActions.verify(selected.a.id, selected.m.index))}>Verify & release</button><button className="btn btn--secondary" disabled={tx.busy || !proofReady} onClick={() => act(`r-${selected.a.id}`, () => escrowActions.reject(selected.a.id, selected.m.index))}>Reject proof</button></div>{!proofReady && !tx.message && <p className="muted-copy">Verify and reject will be available after the proof image loads and passes hash verification.</p>}{tx.message && <p className={`form-message ${tx.error ? 'form-message--error' : ''}`}>{tx.message}</p>}</div></WorkflowModal>}
  </Page>
}

export function ShipperFunds() {
  const data = useAgreements('shipper'); const tx = useTransaction(data.refresh); const [now] = useState(() => Date.now() / 1000)
  return <Page title="Funding & refunds" subtitle="Fund pending agreements or recover unreleased escrow after the deadline."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!data.agreements.length} />
    {data.agreements.length > 0 && <PaginatedAgreementTable agreements={data.agreements.filter((a) => a.status < 3)} role="shipper" actions={(a) => a.status === 0 ? <button className="btn btn--compact btn--primary" disabled={tx.busy} onClick={() => tx.run(`f-${a.id}`, () => escrowActions.fund(a.id, a.totalValue))}>Fund {a.totalEth} ETH</button> : (a.deadline < now && a.pendingProofCount === 0 && a.fundedAmount > a.releasedAmount && a.status < 3) ? <button className="btn btn--compact btn--secondary" disabled={tx.busy} onClick={() => tx.run(`refund-${a.id}`, () => escrowActions.refund(a.id))}>Refund remainder</button> : <span className="muted-copy">No action available</span>} />}{tx.message && <p className={`form-message ${tx.error ? 'form-message--error' : ''}`}>{tx.message}</p>}
  </Page>
}

export function CarrierAgreements() { const data = useAgreements('carrier'); return <Page title="Assigned agreements" subtitle="Review escrow terms, milestones, values, and delivery deadlines."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!data.agreements.length} />{data.agreements.length > 0 && <PaginatedAgreementTable agreements={data.agreements.filter((a) => a.status < 3)} role="carrier" pageSize={5} />}</Page> }

// eslint-disable-next-line no-unused-vars
function CarrierProofsLegacy() {
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

function PaginatedAgreementTable({ agreements, role, actions, pageSize = 20, expandable = false }) {
  const [selection, setSelection] = useState({ id: null, open: false })
  const [page, setPage] = useState(1)
  const ordered = [...agreements].sort((a, b) => b.id - a.id)
  const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize))
  const visible = ordered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])
  const footer = <div className="payment-pagination table-pagination"><span>Showing {visible.length} of {ordered.length} agreements</span><div><button type="button" disabled={page === 1} onClick={() => { setSelection({ id: null, open: false }); setPage((current) => current - 1) }}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => { setSelection({ id: null, open: false }); setPage((current) => current + 1) }}>Next</button></div></div>
  const selected = visible.find((a) => a.id === selection.id)
  const expanded = Boolean(expandable && selected && selection.open)
  const panelId = 'shipper-agreement-progress'
  return <AgreementTable agreements={visible} role={role} actions={actions} footer={footer} selectedId={expanded ? selection.id : null} panelId={panelId} onSelect={expandable ? (id) => setSelection((current) => ({ id, open: current.id !== id || !current.open })) : undefined} />
}

export function CarrierProofs() {
  const data = useAgreements('carrier')
  const tx = useTransaction(data.refresh)
  const [proofs, setProofs] = useState({})
  const [proofHashes, setProofHashes] = useState({})
  const [selected, setSelected] = useState(null)
  const [now] = useState(() => Date.now() / 1000)
  const items = data.agreements.flatMap((a) => a.milestones.filter((m) => a.status > 0 && a.status < 3 && a.deadline >= now && !m.verified && (m.index === a.nextProofIndex || m.rejected)).map((m) => ({ a, m })))
  const proofKey = (agreementId, milestoneIndex) => `${agreementId}-${milestoneIndex}`
  const selectedKey = selected ? proofKey(selected.a.id, selected.m.index) : ''
  const selectedProof = selected ? proofs[selectedKey] : null
  const closeProofModal = () => {
    if (selectedKey) {
      const preview = proofs[selectedKey]?.preview
      if (preview) URL.revokeObjectURL(preview)
      setProofs((current) => { const next = { ...current }; delete next[selectedKey]; return next })
      setProofHashes((current) => { const next = { ...current }; delete next[selectedKey]; return next })
    }
    setSelected(null)
  }
  return <Page title="Submit proof" subtitle="Select a milestone to review agreement details and submit its proof image."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!items.length} />
    {items.length > 0 && <div className="card table-card workflow-table"><table className="ship-table"><thead><tr><th>Agreement</th><th>Milestone</th><th>Release</th><th>Deadline</th><th>Status</th><th /></tr></thead><tbody>{items.map(({ a, m }) => <tr key={`${a.id}-${m.index}`}><td className="ship-table__id">#{a.id}</td><td>{m.description}</td><td>{m.percent}%</td><td>{dateTime(a.deadline)}</td><td>{m.rejected ? 'Resubmission required' : 'Ready for proof'}</td><td><button className="btn btn--compact btn--primary" type="button" onClick={() => { tx.clearMessage(); setSelected({ a, m }) }}>Submit proof</button></td></tr>)}</tbody></table></div>}
    {tx.message && <p className={`form-message ${tx.error ? 'form-message--error' : ''}`}>{tx.message}</p>}
    {selected && <WorkflowModal title={`Agreement #${selected.a.id} · Milestone ${selected.m.index + 1}`} onClose={closeProofModal}><div className="workflow-detail"><span className="card-kicker">{selected.m.rejected ? 'Proof resubmission' : 'Proof required'}</span><h3>{selected.m.description}</h3><p>{selected.m.percent}% of {selected.a.totalEth} ETH</p><p>Submission deadline: {dateTime(selected.a.deadline)}</p><label className="workflow-file">Proof image<input required accept="image/jpeg,image/png,image/webp" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) { if (selectedProof?.preview) URL.revokeObjectURL(selectedProof.preview); setProofs({ ...proofs, [selectedKey]: { file, preview: URL.createObjectURL(file) } }) } }} /></label>{selectedProof && <><img className="proof-image" src={selectedProof.preview} alt="Proof selected for submission" /><p className="muted-copy">{selectedProof.file.name}</p></>}{proofHashes[selectedKey] && <p className="muted-copy">SHA-256: {proofHashes[selectedKey]}</p>}<button className="btn btn--primary" disabled={tx.busy || !selectedProof} onClick={async () => { const success = await tx.run(`p-${selected.a.id}`, async () => { const uploaded = await uploadProofImage(selectedProof.file, selected.a.id, selected.m.index); setProofHashes({ ...proofHashes, [selectedKey]: uploaded.proofHash }); return escrowActions.submitProof(selected.a.id, selected.m.index, uploaded.proofHash) }); if (success) closeProofModal() }}>Hash image & submit proof</button>{tx.message && <p className={`form-message ${tx.error ? 'form-message--error' : ''}`}>{tx.message}</p>}</div></WorkflowModal>}
  </Page>
}

export function CarrierClaims() {
  const data = useAgreements('carrier'); const tx = useTransaction(data.refresh); const [now] = useState(() => Date.now() / 1000)
  const items = data.agreements.flatMap((a) => a.milestones.filter((m) => m.index === a.nextVerificationIndex && m.proofSubmittedAt && !m.verified && !m.rejected && now > m.proofSubmittedAt + 259200).map((m) => ({ a, m })))
  return <Page title="Timeout claims" subtitle="Claim milestone payment when the three-day shipper review period has elapsed."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!items.length} /><div className="item-grid">{items.map(({ a, m }) => <article className="card action-card" key={`${a.id}-${m.index}`}><span className="card-kicker">Agreement #{a.id}</span><h2>{m.description}</h2><p>The review window ended {dateTime(m.proofSubmittedAt + 259200)}.</p><button className="btn btn--primary" disabled={tx.busy} onClick={() => tx.run(`c-${a.id}`, () => escrowActions.claim(a.id, m.index))}>Claim {m.percent}% payment</button></article>)}</div>{tx.message && <p className="form-message">{tx.message}</p>}</Page>
}

export function AgreementHistory({ role }) { const data = useAgreements(role); const history = data.agreements.filter((a) => a.status >= 3); return <Page title="Agreement history" subtitle="Completed and refunded agreements recorded by the deployed escrow contract."><PageState loading={data.loading} error={data.error} connected={data.isConnected} empty={!history.length} />{history.length > 0 && <PaginatedAgreementTable agreements={history} role={role} />}</Page> }
