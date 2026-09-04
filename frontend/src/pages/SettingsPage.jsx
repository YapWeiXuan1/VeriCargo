import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { Popup } from '../components/Popup'
import { useAuth } from '../context/auth'
import {
  CONTRACT_ADDRESS,
  shortAddress,
} from '../services/escrowService'
import {
  loadSettings,
  resetSettings,
  saveSettings,
} from '../services/settingsService'
import '../styles/main.css'

function PreferenceToggle({
  checked,
  description,
  label,
  onChange,
}) {
  return (
    <label className="settings-toggle">
      <span className="settings-toggle__copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />

      <span
        className="settings-toggle__control"
        aria-hidden="true"
      >
        <span />
      </span>
    </label>
  )
}

function SettingsPage() {
  const { user } = useAuth()

  const [preferences, setPreferences] =
    useState(loadSettings)

  const [message, setMessage] = useState('')

  const updatePreference = (name, value) => {
    setPreferences((current) => ({
      ...current,
      [name]: value,
    }))

    setMessage('')
  }

  const handleSave = (event) => {
    event.preventDefault()

    const saved = saveSettings(preferences)
    setPreferences(saved)
    setMessage('Settings saved for this browser.')
  }

  const handleRestoreDefaults = () => {
    const defaults = resetSettings()
    setPreferences(defaults)
    setMessage('Default settings restored.')
  }

  return (
    <AppLayout
      title="Settings"
      subtitle="Control VeriCargo reminders and review your account configuration."
    >
      <form
        className="settings-stack"
        onSubmit={handleSave}
      >
        <section className="card settings-card">
          <div className="settings-card__heading">
            <div>
              <span className="profile-card__eyebrow">
                Notifications
              </span>
              <h2>Workflow preferences</h2>
            </div>

            <span className="settings-card__device">
              This browser
            </span>
          </div>

          <p className="settings-card__intro">
            Choose which reminders appear in the
            notification menu. These preferences are stored
            only on this device.
          </p>

          <div className="settings-options">
            <PreferenceToggle
              checked={preferences.actionReminders}
              label="Action-required reminders"
              description="Funding, proof review, proof submission, timeout claim, refund, and wallet reminders."
              onChange={(value) =>
                updatePreference(
                  'actionReminders',
                  value
                )
              }
            />

            <PreferenceToggle
              checked={preferences.statusUpdates}
              label="Agreement status updates"
              description="Notifications when agreements are completed or refunded."
              onChange={(value) =>
                updatePreference(
                  'statusUpdates',
                  value
                )
              }
            />
          </div>

          <div className="button-row settings-actions">
            <button
              className="btn btn--primary"
              type="submit"
            >
              Save settings
            </button>

            <button
              className="btn btn--secondary"
              type="button"
              onClick={handleRestoreDefaults}
            >
              Restore defaults
            </button>
          </div>
        </section>

        <section className="settings-grid">
          <article className="card settings-card">
            <span className="profile-card__eyebrow">
              Account
            </span>

            <h2>Identity and security</h2>

            <dl className="settings-details">
              <div>
                <dt>Email</dt>
                <dd>{user?.email || '—'}</dd>
              </div>

              <div>
                <dt>Role</dt>
                <dd>{user?.role || '—'}</dd>
              </div>
            </dl>

            <Link
              className="btn btn--secondary"
              to="/profile"
            >
              Manage profile and password
            </Link>
          </article>

          <article className="card settings-card">
            <span className="profile-card__eyebrow">
              Blockchain
            </span>

            <h2>Network configuration</h2>

            <dl className="settings-details">
              <div>
                <dt>Network</dt>
                <dd>Sepolia testnet</dd>
              </div>

              <div>
                <dt>Chain ID</dt>
                <dd>11155111</dd>
              </div>

              <div>
                <dt>Contract</dt>
                <dd title={CONTRACT_ADDRESS}>
                  {CONTRACT_ADDRESS
                    ? shortAddress(CONTRACT_ADDRESS)
                    : 'Not configured'}
                </dd>
              </div>
            </dl>

            <Link
              className="btn btn--secondary"
              to="/wallet"
            >
              Manage MetaMask wallet
            </Link>
          </article>
        </section>
      </form>

      {message && (
        <Popup
          variant="success"
          message={message}
          onClose={() => setMessage('')}
        />
      )}
    </AppLayout>
  )
}

export default SettingsPage