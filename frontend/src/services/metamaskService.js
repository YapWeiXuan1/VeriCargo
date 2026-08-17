
export const connectMetaMask = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  if (chainId !== '0xaa36a7') { // Sepolia chain ID
    throw new Error('Please switch MetaMask to the Sepolia testnet.');
  }
  return accounts[0]; // Return the first account
}

export const getConnectedMetaMaskAccount = async () => {
  if (!window.ethereum) return null
  const accounts = await window.ethereum.request({ method: 'eth_accounts' })
  if (!accounts[0]) return null
  const chainId = await window.ethereum.request({ method: 'eth_chainId' })
  return chainId === '0xaa36a7' ? accounts[0] : null
}
