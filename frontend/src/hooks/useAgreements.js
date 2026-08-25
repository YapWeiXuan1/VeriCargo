import { useCallback, useEffect, useState } from 'react'
import useWallet from './useWallet'
import { loadAgreements } from '../services/escrowService'

export default function useAgreements(role) {
  const { account, isConnected } = useWallet()
  const [agreements, setAgreements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    if (!account || !isConnected) { setAgreements([]); return }
    setLoading(true); setError('')
    try { setAgreements(await loadAgreements(account, role)) }
    catch (err) { setError(err.shortMessage || err.reason || err.message || 'Unable to read agreements.') }
    finally { setLoading(false) }
  }, [account, isConnected, role])
  useEffect(() => {
    let active = true
    Promise.resolve().then(async () => {
      if (!account || !isConnected) { if (active) setAgreements([]); return }
      if (active) { setLoading(true); setError('') }
      try { const next = await loadAgreements(account, role); if (active) setAgreements(next) }
      catch (err) { if (active) setError(err.shortMessage || err.reason || err.message || 'Unable to read agreements.') }
      finally { if (active) setLoading(false) }
    })
    return () => { active = false }
  }, [account, isConnected, role])
  return { agreements, loading, error, refresh, account, isConnected }
}
