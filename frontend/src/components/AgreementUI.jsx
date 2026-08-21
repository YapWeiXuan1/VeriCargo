import MetaMaskConnectButton from './metaMaskConnectButton'
import { CONTRACT_ADDRESS } from '../services/escrowService'

export function WalletAction() { return <MetaMaskConnectButton className="wallet-connect wallet-connect--topbar" /> }
export function ContractNote() { return <p className="contract-note">Sepolia contract <code>{CONTRACT_ADDRESS}</code></p> }
export function StatusPill({ status }) {
  const tone = status === 3 ? 'delivered' : status === 4 ? 'issue' : status === 0 ? 'pending' : 'transit'
  const names = ['Pending', 'Funded', 'In progress', 'Completed', 'Refunded']
  return <span className={`status-pill status-pill--${tone}`}>{names[status]}</span>
}
export function PageState({ loading, error, connected, empty }) {
  if (!connected) return <div className="card page-state">Connect MetaMask on Sepolia to load your on-chain agreements.</div>
  if (loading) return <div className="card page-state">Reading agreements from Sepolia…</div>
  if (error) return <div className="card page-state page-state--error">{error}</div>
  if (empty) return <div className="card page-state">No agreements found for this wallet.</div>
  return null
}
