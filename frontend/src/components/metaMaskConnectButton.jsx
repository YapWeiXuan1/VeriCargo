import useWallet from '../hooks/useWallet'
import { Popup } from './Popup'

function MetaMaskConnectButton({ className = '' }) {
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

  let buttonText = 'Sign to connect MetaMask'

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
          void linkWallet().catch(() => {
            // The provider stores and renders the error for the user.
          })
        }}
        disabled={loading}
      >
        {buttonText}
      </button>

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
