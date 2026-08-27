import { BrowserProvider, Contract, formatEther, isHexString, keccak256, toUtf8Bytes } from 'ethers'

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS

export const ESCROW_ABI = [
  'function createAgreement(address carrier,uint256 totalValue,uint256 deadline,string[] descriptions,uint8[] percentages) returns (uint256)',
  'function fundAgreement(uint256 agreementId) payable',
  'function submitProofHash(uint256 agreementId,uint256 milestoneIndex,bytes32 hash)',
  'function verifyMilestone(uint256 agreementId,uint256 milestoneIndex)',
  'function rejectMilestone(uint256 agreementId,uint256 milestoneIndex)',
  'function claimAfterVerificationTimeout(uint256 agreementId,uint256 milestoneIndex)',
  'function refund(uint256 agreementId)',
  'function getAgreement(uint256 agreementId) view returns (address shipper,address carrier,uint256 totalValue,uint256 deadline,uint256 fundedAmount,uint256 releasedAmount,uint256 nextProofIndex,uint256 nextVerificationIndex,uint256 verifiedMilestoneCount,uint256 pendingProofCount,uint8 status,(string description,uint8 percent,bool verified,bool rejected,uint256 proofSubmittedAt,uint256 verifiedAt)[] milestones)',
  'function getShipperAgreements(address shipper) view returns (uint256[])',
  'function getCarrierAgreements(address carrier) view returns (uint256[])',
  'function getVerificationDeadline(uint256 agreementId,uint256 milestoneIndex) view returns (uint256)',
  'function isProofPending(uint256 agreementId,uint256 milestoneIndex) view returns (bool)',
  'function proofHashes(uint256 agreementId,uint256 milestoneIndex) view returns (bytes32)',
]

export const STATUS_NAMES = ['Pending', 'Funded', 'In progress', 'Completed', 'Refunded']
export function shortAddress(value) { return `${value.slice(0, 6)}…${value.slice(-4)}` }
export function dateTime(seconds) { return seconds ? new Date(seconds * 1000).toLocaleString() : '—' }

export function formatEthValue(wei, maximumDecimals = 6) {
  const value = formatEther(wei || 0n)
  const [whole, fraction = ''] = value.split('.')
  const trimmed = fraction.slice(0, maximumDecimals).replace(/0+$/, '')
  if (BigInt(wei || 0n) > 0n && whole === '0' && !trimmed) return `<0.${'0'.repeat(maximumDecimals - 1)}1`
  return trimmed ? `${whole}.${trimmed}` : whole
}

export async function loadWalletBalance(account) {
  if (!account || !window.ethereum) return 0n
  return new BrowserProvider(window.ethereum).getBalance(account)
}

async function getContract(write = false) {
  if (!window.ethereum) throw new Error('MetaMask is required to use the escrow contract.')
  if (!CONTRACT_ADDRESS) throw new Error('VITE_CONTRACT_ADDRESS is not configured.')
  const provider = new BrowserProvider(window.ethereum)
  const network = await provider.getNetwork()
  if (network.chainId !== 11155111n) throw new Error('Switch MetaMask to the Sepolia testnet.')
  return new Contract(CONTRACT_ADDRESS, ESCROW_ABI, write ? await provider.getSigner() : provider)
}

export function proofToHash(value) {
  const normalized = value.trim()
  if (!normalized) throw new Error('Enter a proof reference or a bytes32 hash.')
  return isHexString(normalized, 32) ? normalized : keccak256(toUtf8Bytes(normalized))
}

export async function loadAgreements(account, role) {
  if (!account) return []
  const contract = await getContract()
  const ids = role === 'carrier'
    ? await contract.getCarrierAgreements(account)
    : await contract.getShipperAgreements(account)
  return Promise.all(ids.map(async (rawId) => {
    const data = await contract.getAgreement(rawId)
    const milestones = await Promise.all(data.milestones.map(async (item, index) => ({
      index,
      description: item.description,
      percent: Number(item.percent),
      verified: item.verified,
      rejected: item.rejected,
      proofSubmittedAt: Number(item.proofSubmittedAt),
      verifiedAt: Number(item.verifiedAt),
      proofHash: item.proofSubmittedAt ? await contract.proofHashes(rawId, index) : null,
    })))
    return {
      id: Number(rawId), shipper: data.shipper, carrier: data.carrier,
      totalValue: data.totalValue, totalEth: formatEther(data.totalValue),
      deadline: Number(data.deadline), fundedAmount: data.fundedAmount,
      releasedAmount: data.releasedAmount, releasedEth: formatEther(data.releasedAmount),
      nextProofIndex: Number(data.nextProofIndex), nextVerificationIndex: Number(data.nextVerificationIndex),
      verifiedMilestoneCount: Number(data.verifiedMilestoneCount), pendingProofCount: Number(data.pendingProofCount),
      status: Number(data.status), statusName: STATUS_NAMES[Number(data.status)] ?? 'Unknown', milestones,
    }
  }))
}

async function send(method, args = [], overrides) {
  const contract = await getContract(true)
  const tx = overrides ? await contract[method](...args, overrides) : await contract[method](...args)
  return tx.wait()
}

export const escrowActions = {
  create: (carrier, totalValue, deadline, descriptions, percentages) => send('createAgreement', [carrier, totalValue, deadline, descriptions, percentages]),
  fund: (id, value) => send('fundAgreement', [id], { value }),
  submitProof: (id, index, proof) => send('submitProofHash', [id, index, proofToHash(proof)]),
  verify: (id, index) => send('verifyMilestone', [id, index]),
  reject: (id, index) => send('rejectMilestone', [id, index]),
  claim: (id, index) => send('claimAfterVerificationTimeout', [id, index]),
  refund: (id) => send('refund', [id]),
}
