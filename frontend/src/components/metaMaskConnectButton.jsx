import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import useWallet from '../hooks/useWallet'
import { ConfirmPopup, Popup } from './Popup'

function MetaMaskConnectButton({ className = '' }) {
  const { pathname } = useLocation()
  const [confirmLink, setConfirmLink] = useState(false)
  const {
    account,
    linkedAddress,
    accountMatches,
    loading,
    linking,
    error,
    message,
    clearWalletNotice,
    linkWallet,
  } = useWallet()

  useEffect(() => {
    clearWalletNotice()
  }, [pathname, clearWalletNotice])

  let buttonText = 'Connect MetaMask'

  if (linking) {
    buttonText = 'Sign in MetaMask...'
  } else if (accountMatches) {
    buttonText =
      `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`
  } else if (account && linkedAddress) {
    buttonText = 'Wrong MetaMask account'
  } else if (linkedAddress) {
    buttonText = 'Sign in with registered wallet'
  }

  return (
    <div className={`wallet-connect ${className}`.trim()}>
      <button
        type="button"
        className="metamask-button"
        onClick={() => {
          if (!linkedAddress) { setConfirmLink(true); return }
          void linkWallet().catch(() => {
            // The provider stores and renders the error for the user.
          })
        }}
        disabled={loading}
      >
        {loading ? <span className="state-spinner state-spinner--button" aria-hidden="true" /> : <img className="metamask-icon" src="/metamask-logo-pack/MetaMask-Logo-Pack/MetaMask/MetaMask-icon-fox.svg" alt="" />}
        {buttonText}
      </button>

      {confirmLink && <ConfirmPopup
        title="Link this MetaMask account permanently?"
        message="After verification, this VeriCargo account is locked to the selected MetaMask wallet and cannot be changed. Confirm that you selected the correct account."
        confirmLabel="Connect and sign"
        cancelLabel="Cancel"
        onCancel={() => setConfirmLink(false)}
        onConfirm={() => {
          setConfirmLink(false)
          void linkWallet().catch(() => {})
        }}
      />}

      {message && (
        <Popup
          variant="success"
          title="MetaMask connected"
          message={message}
          onClose={clearWalletNotice}
        />
      )}
      {error && (
        <Popup
          variant="error"
          message={error}
          onClose={clearWalletNotice}
        />
      )}
    </div>
  )
}

export default MetaMaskConnectButton
