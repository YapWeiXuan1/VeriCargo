import '../styles/main.css'
import AppLayout from '../components/AppLayout'
import MetaMaskConnectButton from '../components/metaMaskConnectButton'
import useWallet from '../hooks/useWallet'

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')) ?? {} } catch { return {} }
}

function Profile() {
  const user = getUser()
  const { account, isConnected } = useWallet()
  return (
    <AppLayout title="Profile" subtitle="Manage your VeriCargo identity and blockchain wallet.">
      <div className="profile-grid">
        <section className="card profile-card">
          <span className="profile-card__eyebrow">Account details</span>
          <h2>{user.fullName || user.name || 'VeriCargo user'}</h2>
          <dl className="profile-details">
            <div><dt>Email</dt><dd>{user.email || 'Not available'}</dd></div>
            <div><dt>Role</dt><dd>{user.role || 'Not available'}</dd></div>
          </dl>
        </section>
        <section className="card profile-card">
          <span className="profile-card__eyebrow">Blockchain wallet</span>
          <h2>MetaMask</h2>
          <p className="profile-card__copy">Connect your Sepolia wallet before creating shipments, submitting proof, or approving blockchain transactions.</p>
          <MetaMaskConnectButton className="wallet-connect wallet-connect--profile" />
          <div className={`wallet-state ${isConnected ? 'wallet-state--connected' : ''}`}>
            <span aria-hidden="true" />{isConnected ? account : 'No wallet connected'}
          </div>
        </section>
      </div>
    </AppLayout>
  )
}

export default Profile
