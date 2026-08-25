import { BrowserProvider } from "ethers";

function getEthereum() {
  if (!window.ethereum) throw new Error('MetaMask is not installed');
  return window.ethereum;

}

function getChainId() {
  return window.ethereum.request({ method: 'eth_chainId' });
}

export const connectMetaMask = async () => {

  const accounts = await getEthereum().request({ method: 'eth_requestAccounts' });
  

  const chainId = await getChainId();
  if (chainId !== '0xaa36a7') { // Sepolia chain ID
    throw new Error('Please switch MetaMask to the Sepolia testnet.');
  }
  return accounts[0]; // Return the first account
}

export const getConnectedMetaMaskAccount = async () => {
  if (!window.ethereum) return null
  const accounts = await getEthereum().request({
    method: 'eth_accounts'

  })
  if (!accounts[0]) return null
  const chainId = await getChainId();
  return chainId === '0xaa36a7' ? accounts[0] : null
}

export const disconnectMetaMask = async () => {
  const ethereum = getEthereum()

  await ethereum.request({
    method: 'wallet_revokePermissions',
    params: [{ eth_accounts: {} }],
  })

  const accounts = await ethereum.request({ method: 'eth_accounts' })
  if (accounts.length > 0) {
    throw new Error('MetaMask did not revoke this site connection.')
  }
}

export async function signMetaMaskMessage(message, expectedAccount) {
  const provider = new BrowserProvider(getEthereum());
  const signer = await provider.getSigner();
  const actualAccount = (await signer.getAddress()).toLowerCase();
  if (actualAccount !== expectedAccount.toLowerCase()) {
    throw new Error("MetaMask changed accounts. Create a new challenge.");
  }

  return signer.signMessage(message);
}
