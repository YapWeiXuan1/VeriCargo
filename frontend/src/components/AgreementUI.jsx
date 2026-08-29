import MetaMaskConnectButton from './metaMaskConnectButton'
import { CONTRACT_ADDRESS } from '../services/escrowService'

export function WalletAction() { return <MetaMaskConnectButton className="wallet-connect wallet-connect--topbar" /> }
export function ContractNote() { return <p className="contract-note">Sepolia contract <code>{CONTRACT_ADDRESS}</code></p> }
export function StatusPill({ status }) {
  const tone = status === 3 ? 'delivered' : status === 4 ? 'issue' : status === 0 ? 'pending' : 'transit'
  const names = ['Pending', 'Funded', 'In progress', 'Completed', 'Refunded']
  return <span className={`status-pill status-pill--${tone}`}>{names[status]}</span>
}
export function EmptyState({ title = 'No records found', message = 'New records will appear here when they become available.', compact = false }) {
  return <div className={`empty-state ${compact ? 'empty-state--compact' : ''}`}><span className="empty-state__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3h10l4 4v14H5zM14 3v5h5M9 13h6M9 17h4" /></svg></span><div><strong>{title}</strong><p>{message}</p></div></div>
}
export function PageState({ loading, error, connected, empty }) {
  if (!connected) return <div className="card page-state page-state--reminder"><span className="page-state__icon" aria-hidden="true">!</span><div><strong>MetaMask connection required</strong><p>Connect your registered Sepolia wallet to load agreements and continue.</p></div></div>
  if (loading) return <div className="card page-state page-state--loading"><span className="state-spinner" aria-hidden="true" /><div><strong>Loading records</strong><p>Reading the latest agreement data from Sepolia…</p></div></div>
  if (error) return <div className="card page-state page-state--error">{error}</div>
  if (empty) return <div className="card page-state page-state--empty"><EmptyState title="No records found" message="There are no agreement records available for this wallet yet." compact /></div>
  return null
}
