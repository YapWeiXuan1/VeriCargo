const crypto = require('node:crypto')
const { Contract, JsonRpcProvider } = require('ethers')
const supabase = require('./supabaseClient')

const BUCKET = 'proof-images'
const ESCROW_ABI = [
  'function getAgreement(uint256 agreementId) view returns (address shipper,address carrier,uint256 totalValue,uint256 deadline,uint256 fundedAmount,uint256 releasedAmount,uint256 nextProofIndex,uint256 nextVerificationIndex,uint256 verifiedMilestoneCount,uint256 pendingProofCount,uint8 status,(string description,uint8 percent,bool verified,bool rejected,uint256 proofSubmittedAt,uint256 verifiedAt)[] milestones)',
  'function proofHashes(uint256 agreementId,uint256 milestoneIndex) view returns (bytes32)',
]
const MIME_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function getAgreementId(value) {
  const agreementId = Number(value)
  if (!Number.isInteger(agreementId) || agreementId < 0) throw createError('A valid agreement ID is required.')
  return agreementId
}

function getMilestoneIndex(value) {
  const milestoneIndex = Number(value)
  if (!Number.isInteger(milestoneIndex) || milestoneIndex < 0) throw createError('A valid milestone index is required.')
  return milestoneIndex
}

async function getContract() {
  if (!process.env.SEPOLIA_RPC_URL || !process.env.VITE_CONTRACT_ADDRESS) {
    throw createError('Escrow contract configuration is missing.', 500)
  }
  return new Contract(process.env.VITE_CONTRACT_ADDRESS, ESCROW_ABI, new JsonRpcProvider(process.env.SEPOLIA_RPC_URL))
}

async function assertAgreementParticipant(userId, agreementIdValue, participant) {
  const agreementId = getAgreementId(agreementIdValue)
  const { data: user, error } = await supabase
    .from('users')
    .select('wallet_address, role')
    .eq('id', userId)
    .single()
  if (error || !user?.wallet_address) throw createError('A verified wallet is required.', 403)
  if (user.role?.toLowerCase() !== participant) throw createError(`Only the agreement ${participant} can access this proof.`, 403)

  const agreement = await (await getContract()).getAgreement(agreementId)
  const expectedWallet = agreement[participant].toLowerCase()
  if (user.wallet_address.toLowerCase() !== expectedWallet) {
    throw createError(`Only the agreement ${participant} can access this proof.`, 403)
  }

  return { agreementId, contract: await getContract() }
}

exports.storeProofImage = async ({ imageData, mimeType, agreementId, milestoneIndex }, userId) => {
  const { agreementId: validAgreementId, contract } = await assertAgreementParticipant(userId, agreementId, 'carrier')
  const validMilestoneIndex = getMilestoneIndex(milestoneIndex)
  const agreement = await contract.getAgreement(validAgreementId)
  if (validMilestoneIndex >= agreement.milestones.length) throw createError('Milestone does not exist.')
  if (!MIME_TYPES[mimeType]) throw createError('Use a JPG, PNG, or WebP proof image.')
  if (typeof imageData !== 'string') throw createError('Proof image data is required.')

  const base64 = imageData.replace(/^data:[^;]+;base64,/, '')
  const buffer = Buffer.from(base64, 'base64')
  if (!buffer.length || buffer.length > 10 * 1024 * 1024) throw createError('Proof images must be between 1 byte and 10 MB.')

  const proofHash = `0x${crypto.createHash('sha256').update(buffer).digest('hex')}`
  const objectPath = `${proofHash.slice(2)}/proof.${MIME_TYPES[mimeType]}`
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: mimeType,
    upsert: false,
  })

  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw createError(`Unable to store proof image: ${error.message}`, 500)
  }

  return { proofHash, mimeType }
}

exports.getProofImageUrl = async (proofHash, userId, agreementId, milestoneIndex) => {
  if (!/^0x[0-9a-fA-F]{64}$/.test(proofHash)) throw createError('Invalid proof hash.')
  const { agreementId: validAgreementId, contract } = await assertAgreementParticipant(userId, agreementId, 'shipper')
  const validMilestoneIndex = getMilestoneIndex(milestoneIndex)
  const onChainHash = await contract.proofHashes(validAgreementId, validMilestoneIndex)
  if (onChainHash.toLowerCase() !== proofHash.toLowerCase()) throw createError('This image does not belong to the requested agreement milestone.', 403)

  const folder = proofHash.slice(2).toLowerCase()
  const { data: files, error: listError } = await supabase.storage.from(BUCKET).list(folder)
  if (listError) throw createError(`Unable to find proof image: ${listError.message}`, 500)

  const file = files?.find((item) => item.name.startsWith('proof.'))
  if (!file) throw createError('No image is stored for this proof hash.', 404)

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(`${folder}/${file.name}`, 300)
  if (error) throw createError(`Unable to open proof image: ${error.message}`, 500)

  return { url: data.signedUrl }
}
