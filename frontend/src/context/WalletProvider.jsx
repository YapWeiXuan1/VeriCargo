import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  connectMetaMask,
  disconnectMetaMask,
  getConnectedMetaMaskAccount,
  signMetaMaskMessage,
} from '../services/metamaskService'

import {
  getWalletStatus,
  getAuthToken,
  requestWalletChallenge,
  verifyWalletChallenge,
} from '../services/axiosClient'

import { WalletContext } from './WalletContext'

function getErrorMessage(error, fallbackMessage) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  )
}

function normaliseWalletStatus(status) {
  const walletAddress =
    status?.walletAddress ??
    status?.wallet_address ??
    null

  const verifiedAt =
    status?.verifiedAt ??
    status?.wallet_verified_at ??
    null

  return {
    hasLinkedWallet:
      status?.hasLinkedWallet ??
      Boolean(walletAddress && verifiedAt),

    walletAddress,
    verifiedAt,
  }
}

function WalletProvider({ children }) {
  // Currently selected MetaMask account
  const [account, setAccount] = useState(null)

  // Wallet information from your Supabase users table
  const [walletStatus, setWalletStatus] = useState(null)

  const [connecting, setConnecting] = useState(false)
  const [linking, setLinking] = useState(false)
  const [checkingWalletStatus, setCheckingWalletStatus] =
    useState(false)

  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  /*
   * Read the currently connected MetaMask account
   * without displaying the MetaMask connection popup.
   */
  const refreshAccount = useCallback(async () => {
    try {
      const connectedAccount =
        await getConnectedMetaMaskAccount()

      setAccount(connectedAccount)

      return connectedAccount
    } catch (err) {
      setAccount(null)

      setError(
        getErrorMessage(
          err,
          'Unable to read MetaMask account'
        )
      )

      return null
    }
  }, [])

  /*
   * Retrieve the wallet registered to the logged-in user.
   *
   * The JWT is automatically attached by your
   * Axios interceptor.
   */
  const refreshWalletStatus = useCallback(async () => {
    setCheckingWalletStatus(true)

    try {
      const response = await getWalletStatus()
      const status = normaliseWalletStatus(response)

      setWalletStatus(status)
      setError(null)

      return status
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        'Unable to retrieve registered wallet'
      )

      setError(errorMessage)

      // Rethrow so linkWallet will stop.
      throw new Error(errorMessage)
    } finally {
      setCheckingWalletStatus(false)
    }
  }, [])

  /*
   * Check MetaMask when WalletProvider first loads,
   * and listen for account or network changes.
   */
  useEffect(() => {
    refreshAccount()

    const ethereum = window.ethereum

    if (!ethereum?.on) {
      return undefined
    }

    const handleAccountsChanged = (accounts) => {
      const selectedAccount =
        accounts[0]?.toLowerCase() ?? null

      setAccount(selectedAccount)
      setError(null)
      setMessage(null)
    }

    const handleChainChanged = () => {
      refreshAccount()
    }

    ethereum.on(
      'accountsChanged',
      handleAccountsChanged
    )

    ethereum.on(
      'chainChanged',
      handleChainChanged
    )

    return () => {
      ethereum.removeListener?.(
        'accountsChanged',
        handleAccountsChanged
      )

      ethereum.removeListener?.(
        'chainChanged',
        handleChainChanged
      )
    }
  }, [refreshAccount])

  /*
   * Check the user's database wallet when the provider
   * loads, but only if a login token exists.
   */
  useEffect(() => {
    const token = getAuthToken()

    if (!token) {
      setCheckingWalletStatus(false)
      return
    }

    refreshWalletStatus().catch(() => {
      // Error is already stored by refreshWalletStatus.
    })
  }, [refreshWalletStatus])

  /*
   * Only connect MetaMask.
   *
   * This does not request or sign a challenge.
   */
  const connect = useCallback(async () => {
    setConnecting(true)
    setError(null)
    setMessage(null)

    try {
      const connectedAccount =
        await connectMetaMask()

      const normalisedAccount =
        connectedAccount.toLowerCase()

      setAccount(normalisedAccount)

      return normalisedAccount
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        'Unable to connect to MetaMask'
      )

      setError(errorMessage)

      // This is important because linkWallet needs
      // to stop if the connection fails.
      throw new Error(errorMessage)
    } finally {
      setConnecting(false)
    }
  }, [])

  /*
   * Complete wallet-linking process:
   *
   * 1. Get the latest database wallet status.
   * 2. Connect MetaMask if necessary.
   * 3. Compare an existing registered wallet.
   * 4. Otherwise request a challenge.
   * 5. Sign the challenge.
   * 6. Ask the backend to verify it.
   */
  const linkWallet = useCallback(async () => {
    setLinking(true)
    setError(null)
    setMessage(null)

    try {
      /*
       * Always request the newest database status.
       * Do not rely only on old React state.
       */
      const currentStatus =
        await refreshWalletStatus()

      /*
       * Always read MetaMask again. React state can still contain the
       * previously selected account when the user has just switched accounts
       * in the extension.
       */
      let selectedAccount = await getConnectedMetaMaskAccount()

      if (!selectedAccount) {
        selectedAccount = await connectMetaMask()
      }

      selectedAccount = selectedAccount.toLowerCase()

      const registeredAddress =
        currentStatus.walletAddress?.toLowerCase() ??
        null

      /*
       * Returning user:
       * Do not create another challenge.
       * Only compare the selected MetaMask account.
       */
      if (
        currentStatus.hasLinkedWallet &&
        registeredAddress
      ) {
        // Keep the displayed state in sync even when the account is wrong.
        // isConnected remains false because accountMatches will be false.
        setAccount(selectedAccount)

        if (
          selectedAccount.toLowerCase() !==
          registeredAddress
        ) {
          throw new Error(
            `Wrong MetaMask account. Please switch to ${registeredAddress}.`
          )
        }

        setMessage(
          'MetaMask account matches your registered wallet.'
        )

        return {
          alreadyLinked: true,
          walletAddress: registeredAddress,
        }
      }

      /*
       * First-time wallet linking:
       * Request a challenge from the backend.
       */
      const challenge =
        await requestWalletChallenge(
          selectedAccount
        )

      /*
       * MetaMask signs the exact message generated
       * and stored by the backend.
       */
      const signature =
        await signMetaMaskMessage(
          challenge.message,
          selectedAccount
        )

      /*
       * Send only the challenge ID and signature.
       * The backend retrieves the original message.
       */
      const verification =
        await verifyWalletChallenge(
          challenge.challengeId,
          signature
        )

      // Do not show this wallet as connected in VeriCargo until the server has
      // verified the signature and linked the address to this user.
      setAccount(selectedAccount)

      /*
       * Refresh database state after successful linking.
       */
      await refreshWalletStatus()

      setMessage('MetaMask wallet linked successfully.')

      return verification
    } catch (err) {
      const errorMessage = getErrorMessage(
        err,
        'Unable to link MetaMask'
      )

      if (errorMessage.includes('already linked to another user')) {
        try {
          await disconnectMetaMask()
        } catch {
          // The server rejection is still authoritative if MetaMask cannot
          // revoke the browser permission on this version of the extension.
        }
        setAccount(null)
      }

      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLinking(false)
    }
  }, [refreshWalletStatus])

  const linkedAddress =
    walletStatus?.hasLinkedWallet
      ? walletStatus.walletAddress?.toLowerCase() ?? null
      : null

  /*
   * A selected account that is not the one verified for this VeriCargo user
   * must not remain authorised for this site. MetaMask supports revoking the
   * eth_accounts permission; clear the app state either way.
   */
  useEffect(() => {
    if (!account || !linkedAddress || account.toLowerCase() === linkedAddress) {
      return undefined
    }

    let cancelled = false

    const revokeWrongAccount = async () => {
      try {
        await disconnectMetaMask()
        if (!cancelled) {
          setAccount(null)
          setError('The wrong MetaMask account was disconnected from VeriCargo.')
        }
      } catch {
        if (!cancelled) {
          setAccount(null)
          setError('Wrong MetaMask account blocked. Disconnect this site manually in MetaMask if it still appears connected.')
        }
      }
    }

    void revokeWrongAccount()

    return () => {
      cancelled = true
    }
  }, [account, linkedAddress])

  /*
   * This cannot disconnect the MetaMask extension.
   * It only clears your React display state.
   */
  const disconnect = useCallback(() => {
    setAccount(null)
    setError(null)
    setMessage(null)
  }, [])

  const clearWalletNotice = useCallback(() => {
    setError(null)
    setMessage(null)
  }, [])

  /*
   * MetaMask can be connected but still be using
   * the wrong account.
   */
  const accountMatches = Boolean(
    account &&
    linkedAddress &&
    account.toLowerCase() === linkedAddress
  )

  const isWalletVerified =
    Boolean(linkedAddress && accountMatches)

  // MetaMask permission alone is not a VeriCargo connection. A wallet becomes
  // connected only after its signature has been verified for this user.
  const isConnected = isWalletVerified

  const loading =
    connecting ||
    linking ||
    checkingWalletStatus

  const value = useMemo(
    () => ({
      // MetaMask state
      account,
      isConnected,

      // Database wallet state
      walletStatus,
      linkedAddress,
      accountMatches,
      isWalletVerified,

      // Loading state
      loading,
      connecting,
      linking,
      checkingWalletStatus,

      // Messages
      error,
      message,

      // Functions
      connect,
      disconnect,
      clearWalletNotice,
      linkWallet,
      refreshAccount,
      refreshWalletStatus,
    }),
    [
      account,
      walletStatus,
      linkedAddress,
      accountMatches,
      isConnected,
      isWalletVerified,
      loading,
      connecting,
      linking,
      checkingWalletStatus,
      error,
      message,
      connect,
      disconnect,
      clearWalletNotice,
      linkWallet,
      refreshAccount,
      refreshWalletStatus,
    ]
  )

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  )
}

export default WalletProvider
