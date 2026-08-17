import { useCallback, useEffect, useMemo, useState } from 'react'
import { connectMetaMask, getConnectedMetaMaskAccount } from '../services/metamaskService'
import { WalletContext } from './WalletContext'

function WalletProvider({ children }) {
  const [account, setAccount] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const refreshAccount = useCallback(async () => {
    try { setAccount(await getConnectedMetaMaskAccount()) } catch { setAccount(null) }
  }, [])

  useEffect(() => {
    getConnectedMetaMaskAccount().then(setAccount).catch(() => setAccount(null))
    const ethereum = window.ethereum
    if (!ethereum?.on) return undefined
    const onAccounts = (accounts) => { setAccount(accounts[0] ?? null); setError(null) }
    const onChain = () => refreshAccount()
    ethereum.on('accountsChanged', onAccounts)
    ethereum.on('chainChanged', onChain)
    return () => { ethereum.removeListener?.('accountsChanged', onAccounts); ethereum.removeListener?.('chainChanged', onChain) }
  }, [refreshAccount])

  const connect = useCallback(async () => {
    setLoading(true); setError(null)
    try { setAccount(await connectMetaMask()) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to connect to MetaMask') }
    finally { setLoading(false) }
  }, [])

  const disconnect = useCallback(() => {
    setAccount(null)
    setError(null)
  }, [])

  const value = useMemo(() => ({ account, error, loading, connect, disconnect, isConnected: Boolean(account) }), [account, error, loading, connect, disconnect])
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}
export default WalletProvider
