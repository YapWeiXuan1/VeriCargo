import { useRef, useState } from 'react'
import { decodeShipmentAgreement, saveShipment } from '../services/shipmentService'

export default function useShipmentCreation() {
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [complete, setComplete] = useState(false)
  const guard = useRef(false)
  const save = async (record) => {
    try {
      const agreementId = decodeShipmentAgreement(record.receipt)
      await saveShipment({ ...record.shipment, agreement_id: agreementId, transaction_hash: record.receipt.hash })
      setPending(null); setComplete(true); setMessage('Shipment information saved.')
      return true
    } catch {
      setMessage('Agreement created on Sepolia, but shipment information could not be saved.')
      return false
    }
  }
  const submit = async (shipment, run, action) => {
    if (guard.current || pending || complete) return false
    guard.current = true; setBusy(true); setMessage('')
    let confirmed = false
    let saved = false
    try {
      await run('create', async () => {
        const receipt = await action()
        confirmed = true
        const record = { shipment: { ...shipment }, receipt }
        setPending(record)
        saved = await save(record)
      })
      if (!confirmed) setMessage('The transaction was rejected or failed. Your form information is unchanged; you can retry.')
      return saved
    } finally { guard.current = false; setBusy(false) }
  }
  const retry = async () => {
    if (guard.current || !pending) return false
    guard.current = true; setBusy(true)
    try { return await save(pending) }
    finally { guard.current = false; setBusy(false) }
  }
  return { pending, busy, message, complete, submit, retry }
}
