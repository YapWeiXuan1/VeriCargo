import { useContext } from 'react'
import { WalletContext } from '../context/WalletContext'

function useWallet() {
  const wallet = useContext(WalletContext)
  if (!wallet) throw new Error('useWallet must be used inside WalletProvider')
  return wallet
}

export default useWallet
