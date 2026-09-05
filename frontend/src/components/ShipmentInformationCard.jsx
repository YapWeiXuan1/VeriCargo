import { useEffect, useState } from 'react'
import { getAgreementShipment } from '../services/shipmentService'
import '../styles/shipment.css'

export default function ShipmentInformationCard({ agreementId, report = false }) {
  const [result, setResult] = useState({ loading: true, shipment: null, error: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    getAgreementShipment(agreementId).then((shipment) => { if (active) setResult({ loading: false, shipment, error: '' }) }).catch((error) => { if (active) setResult({ loading: false, shipment: null, error: error.response?.data?.message || 'Unable to load shipment information.' }) })
    return () => { active = false }
  }, [agreementId, attempt])
  if (result.loading) return <div className="shipment-information" role="status">Loading shipment information…</div>
  if (result.error) return <div className="shipment-information" role="alert">{result.error} <button className="btn btn--secondary btn--compact" type="button" onClick={() => { setResult({ loading: true, shipment: null, error: '' }); setAttempt((n) => n + 1) }}>Retry</button></div>
  const s = result.shipment
  if (!s) return <div className="shipment-information shipment-information--empty">No shipment information is linked to this agreement.</div>
  return <section className="shipment-information" aria-label="Shipment information">
    <header><strong>{s.shipment_reference} · {s.cargo_name}</strong><span className="shipment-badge">Off-chain shipment information</span></header>
    <p className="shipment-route">{s.origin} <span aria-label="to">→</span> {s.destination}</p>
    <p>{s.cargo_description}</p>
    <dl><div><dt>Category</dt><dd>{s.cargo_category}</dd></div><div><dt>Weight / quantity</dt><dd>{s.weight} {s.weight_unit} / {s.quantity}</dd></div><div><dt>Handling instructions</dt><dd>{s.handling_instructions || 'None specified'}</dd></div>{s.tracking_number && <div><dt>Tracking number</dt><dd>{s.tracking_number}</dd></div>}</dl>
    {report && <dl><div><dt>Shipment record ID</dt><dd>{s.id}</dd></div><div><dt>Recorded</dt><dd>{new Date(s.created_at).toLocaleString()}</dd></div><div><dt>Last updated</dt><dd>{new Date(s.updated_at).toLocaleString()}</dd></div><div className="history-report__wide"><dt>Creation transaction hash</dt><dd>{s.creation_transaction_hash}</dd></div></dl>}
  </section>
}
