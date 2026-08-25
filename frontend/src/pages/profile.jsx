import '../styles/main.css'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import MetaMaskConnectButton from '../components/metaMaskConnectButton'
import useWallet from '../hooks/useWallet'
import { resetPassword, updateProfile } from '../services/axiosClient'
import { EyeIcon, EyeOffIcon } from '../components/icons'
import { Popup } from '../components/Popup'

function getUser() {
  try {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user')
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function Profile() {
  const location = useLocation()
  const [user, setUser] = useState(getUser)
  const [editing, setEditing] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(Boolean(location.state?.openPassword))
  const [visiblePasswords, setVisiblePasswords] = useState({ current: false, new: false, confirm: false })
  const [profileForm, setProfileForm] = useState({ fullName: user.fullName || user.name || '', email: user.email || '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const { account, isConnected, linkedAddress } = useWallet()

  const saveProfile = async (event) => {
    event.preventDefault(); setMessage(''); setError(''); setSaving(true)
    try {
      const response = await updateProfile(profileForm)
      setUser(response.user)
      const storage = localStorage.getItem('token') ? localStorage : sessionStorage
      storage.setItem('user', JSON.stringify(response.user))
      setEditing(false); setMessage('Profile updated successfully.')
    } catch (err) { setError(err.response?.data?.message || 'Unable to update profile.') }
    finally { setSaving(false) }
  }

  const savePassword = async (event) => {
    event.preventDefault(); setMessage(''); setError('')
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setError('New passwords do not match.'); return }
    setSaving(true)
    try {
      await resetPassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setMessage('Password reset successfully.')
    } catch (err) { setError(err.response?.data?.message || 'Unable to reset password.') }
    finally { setSaving(false) }
  }

  const togglePassword = (field) => setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }))

  return (
    <AppLayout title="Profile" subtitle="Manage your VeriCargo identity and blockchain wallet.">
      <div className="profile-grid">
        <section className="card profile-card">
          <span className="profile-card__eyebrow">Account details</span>
          {editing ? <form className="profile-form" onSubmit={saveProfile}>
            <label>Full name<input required value={profileForm.fullName} onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })} /></label>
            <label>Email<input required type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} /></label>
            <div className="button-row"><button className="btn btn--primary" disabled={saving}>Save changes</button><button className="btn btn--secondary" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
          </form> : <><h2>{user.fullName || user.name || 'VeriCargo user'}</h2><dl className="profile-details"><div><dt>Email</dt><dd>{user.email || 'Not available'}</dd></div><div><dt>Role</dt><dd>{user.role || 'Not available'}</dd></div></dl><button className="btn btn--secondary" type="button" onClick={() => setEditing(true)}>Edit profile</button></>}
        </section>
        <section className="card profile-card">
          <span className="profile-card__eyebrow">Blockchain wallet</span>
          <h2>MetaMask</h2>
          <p className="profile-card__copy">Connect your Sepolia wallet before creating shipments, submitting proof, or approving blockchain transactions.</p>
          <MetaMaskConnectButton className="wallet-connect wallet-connect--profile" />
          
          <div className={`wallet-state ${isConnected ? 'wallet-state--connected' : ''}`}>
            <span aria-hidden="true" />
            {isConnected
              ? account
              : account && linkedAddress
                ? 'Wrong MetaMask account selected'
                : 'No wallet connected'}
          </div>
        </section>
        <section className="card profile-card">
          <span className="profile-card__eyebrow">Security</span>
          <div className="profile-card__heading-row"><h2>Reset password</h2><button className="btn btn--secondary" type="button" onClick={() => setShowPasswordForm((visible) => !visible)}>{showPasswordForm ? 'Hide reset password' : 'Show reset password'}</button></div>
          {showPasswordForm && <form className="profile-form" onSubmit={savePassword}>
            {[
              ['current', 'Current password', 'currentPassword'],
              ['new', 'New password', 'newPassword'],
              ['confirm', 'Confirm new password', 'confirmPassword'],
            ].map(([field, label, name]) => <label key={name}>{label}<span className="profile-password-field"><input required minLength={field === 'current' ? undefined : 8} type={visiblePasswords[field] ? 'text' : 'password'} value={passwordForm[name]} onChange={(event) => setPasswordForm({ ...passwordForm, [name]: event.target.value })} /><button type="button" onClick={() => togglePassword(field)} aria-label={visiblePasswords[field] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>{visiblePasswords[field] ? <EyeOffIcon /> : <EyeIcon />}</button></span></label>)}
            <button className="btn btn--primary" disabled={saving}>Reset password</button>
          </form>}
        </section>
      </div>
      {message && <Popup variant="success" message={message} onClose={() => setMessage('')} />}
      {error && <Popup variant="error" message={error} onClose={() => setError('')} />}
    </AppLayout>
  )
}

export default Profile
