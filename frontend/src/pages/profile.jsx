import '../styles/main.css'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useWallet from '../hooks/useWallet'
import { useAuth } from '../context/auth'
import { resetPassword, updateProfile } from '../services/axiosClient'
import { EyeIcon, EyeOffIcon } from '../components/icons'
import { Popup } from '../components/Popup'
import FormFeedback from '../components/FormFeedback'

function Profile() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuth()
  const { disconnect } = useWallet()
  const [editing, setEditing] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(Boolean(location.state?.openPassword))
  const [visiblePasswords, setVisiblePasswords] = useState({ current: false, new: false, confirm: false })
  const [profileForm, setProfileForm] = useState({ fullName: user?.fullName || '', email: user?.email || '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState('')

  const saveProfile = async (event) => {
    setFeedbackForm('profile')
    event.preventDefault(); setMessage(''); setError('')
    if (!profileForm.fullName.trim() || profileForm.fullName.trim().length > 160) { setError('Enter a full name between 1 and 160 characters.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email.trim()) || profileForm.email.trim().length > 254) { setError('Enter a valid email address of at most 254 characters.'); return }
    setSaving(true)
    try {
      const response = await updateProfile(profileForm)
      setUser(response.user); setMessage('Profile updated successfully.')
    } catch (err) { setError(err.response?.data?.message || 'Unable to update profile.') }
    finally { setSaving(false) }
  }

  const savePassword = async (event) => {
    setFeedbackForm('password')
    event.preventDefault(); setMessage(''); setError('')
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setError('New passwords do not match.'); return }
    if (passwordForm.newPassword.length < 8 || !/[A-Z]/.test(passwordForm.newPassword) || !/[0-9]/.test(passwordForm.newPassword)) { setError('Use at least 8 characters, including an uppercase letter and a number.'); return }
    setSaving(true)
    try {
      await resetPassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setMessage('Password reset successfully.')
    } catch (err) { setError(err.response?.data?.message || 'Unable to reset password.') }
    finally { setSaving(false) }
  }

  const handleLogout = async () => { await logout(); disconnect(); navigate('/login', { replace: true }) }
  const togglePassword = (field) => setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }))

  return <AppLayout title="Profile" subtitle="Manage your VeriCargo identity and account security.">
    <div className="profile-stack">
      <section className="card profile-card">
        <span className="profile-card__eyebrow">Account details</span>
        {editing ? <form className="profile-form" onSubmit={saveProfile}><label>Full name<input required value={profileForm.fullName} onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })} /></label><label>Email<input required type="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} /></label><div className="button-row"><button className="btn btn--primary" disabled={saving}>Save changes</button><button className="btn btn--secondary" type="button" onClick={() => setEditing(false)}>Cancel</button></div>{feedbackForm === 'profile' && <FormFeedback message={message} error={error} />}</form> : <><h2>{user?.fullName || 'VeriCargo user'}</h2><dl className="profile-details"><div><dt>Email</dt><dd>{user?.email}</dd></div><div><dt>Role</dt><dd>{user?.role}</dd></div></dl><button className="btn btn--secondary" type="button" onClick={() => setEditing(true)}>Edit profile</button>{feedbackForm === 'profile' && <FormFeedback message={message} error={error} />}</>}
      </section>

      <section className="card profile-card"><span className="profile-card__eyebrow">Security</span><div className="profile-card__heading-row"><h2>Reset password</h2><button className="btn btn--secondary" type="button" onClick={() => setShowPasswordForm((visible) => !visible)}>{showPasswordForm ? 'Hide' : 'Change password'}</button></div>{showPasswordForm && <form className="profile-form" onSubmit={savePassword}>{[['current', 'Current password', 'currentPassword'], ['new', 'New password', 'newPassword'], ['confirm', 'Confirm new password', 'confirmPassword']].map(([field, label, name]) => <label key={name}>{label}<span className="profile-password-field"><input required minLength={field === 'current' ? undefined : 8} type={visiblePasswords[field] ? 'text' : 'password'} value={passwordForm[name]} onChange={(event) => setPasswordForm({ ...passwordForm, [name]: event.target.value })} /><button type="button" onClick={() => togglePassword(field)} aria-label={`Toggle ${label.toLowerCase()}`}>{visiblePasswords[field] ? <EyeOffIcon /> : <EyeIcon />}</button></span></label>)}<button className="btn btn--primary" disabled={saving}>Reset password</button>{feedbackForm === 'password' && <FormFeedback message={message} error={error} />}</form>}</section>

      <section className="profile-actions"><div><h2>Secure session</h2><p>Log out when you have finished using VeriCargo on this device.</p></div><div className="profile-actions__buttons"><button className="btn btn--danger" type="button" onClick={handleLogout}>Log out</button></div></section>
    </div>
    {message && <Popup variant="success" message={message} onClose={() => setMessage('')} />}
  </AppLayout>
}

export default Profile
