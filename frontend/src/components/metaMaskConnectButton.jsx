import useWallet from '../hooks/useWallet'

function MetaMaskConnectButton({ className = '', label = 'Connect to MetaMask' }) {
  const { account, error, loading, connect } = useWallet()

  return (
    <div className={className}>
      <button
        className="metamask-button"
        type="button"
        onClick={connect}
        disabled={loading}
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
          alt="MetaMask"
          className="metamask-icon"
        />
        {loading
          ? 'Connecting...'
          : account
            ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`
            : label}
      </button>

      {error ? <p className="metamask-status metamask-status--error">{error}</p> : null}

    </div>
  )
}

export default MetaMaskConnectButton
