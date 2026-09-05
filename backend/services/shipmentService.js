const { createClient } = require('@supabase/supabase-js')
const { Interface, JsonRpcProvider } = require('ethers')

const EVENT = 'event AgreementCreated(uint256 indexed agreementId,address indexed shipper,address indexed carrier,uint256 totalValue,uint256 deadline)'
const eventInterface = new Interface([EVENT])
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })
const hashPattern = /^0x[0-9a-f]{64}$/i

function validateShipment(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw fail('Shipment details are required.')
  const fields = { cargo_name: 160, cargo_description: 2000, origin: 300, destination: 300, cargo_category: 100, handling_instructions: 2000, tracking_number: 160 }
  const result = {}
  for (const [name, max] of Object.entries(fields)) {
    const optional = ['tracking_number', 'handling_instructions'].includes(name)
    const value = input[name] ?? ''
    if (typeof value !== 'string' || value.trim().length > max || (!optional && !value.trim())) throw fail(`Invalid ${name.replaceAll('_', ' ')} (maximum ${max} characters).`)
    result[name] = value.trim() || null
  }
  if (!['kg', 't', 'lb'].includes(input.weight_unit)) throw fail('Choose kg, t, or lb for weight.')
  result.weight_unit = input.weight_unit
  for (const name of ['weight', 'quantity']) {
    if (!['string', 'number'].includes(typeof input[name])) throw fail(`Invalid ${name}.`)
    const value = Number(input[name])
    if (!Number.isFinite(value) || value <= 0 || value > 1000000000 || (name === 'quantity' && !Number.isInteger(value))) throw fail(`Invalid ${name}.`)
    result[name] = value
  }
  return result
}

// This client is isolated: existing APIs retain their existing database client.
let client
function getDatabase() {
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!process.env.SUPABASE_URL || !secretKey) throw fail('Shipment storage is not configured. Set the server-only SUPABASE_SECRET_KEY.', 503)
  client ||= createClient(process.env.SUPABASE_URL, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return client
}

function createShipmentService({ database = getDatabase, provider = () => new JsonRpcProvider(process.env.SEPOLIA_RPC_URL), contractAddress = () => process.env.VITE_CONTRACT_ADDRESS } = {}) {
  const dbError = (error) => { if (error) throw fail(error.code === '23505' ? 'This agreement already has shipment information.' : 'Shipment storage is unavailable. Please retry.', error.code === '23505' ? 409 : 503) }
  async function user(userId, shipperOnly = false) {
    const { data, error } = await database().from('users').select('id, role, wallet_address, wallet_verified_at').eq('id', userId).single()
    dbError(error)
    if (!data || (shipperOnly && data.role?.toLowerCase() !== 'shipper')) throw fail('Only a shipper can save shipments.', 403)
    return data
  }
  return {
    async forAgreement(userId, agreementId) {
      await user(userId)
      if (!/^\d+$/.test(String(agreementId)) || BigInt(agreementId) > 9223372036854775807n) throw fail('Invalid agreement ID.')
      // Numeric session subject is validated before it is used in a PostgREST OR expression.
      if (!/^\d+$/.test(String(userId))) throw fail('Invalid session.', 401)
      const { data, error } = await database().from('shipments').select('*').eq('agreement_id', agreementId).or(`shipper_user_id.eq.${userId},carrier_user_id.eq.${userId}`).maybeSingle()
      dbError(error)
      return data
    },
    async create(userId, body) {
      const shipper = await user(userId, true)
      const details = validateShipment(body)
      if (!/^\d+$/.test(String(body.agreement_id))) throw fail('A confirmed agreement ID is required.')
      if (!shipper.wallet_address || !shipper.wallet_verified_at) throw fail('A verified shipper wallet is required.', 403)
      if (typeof body?.transaction_hash !== 'string' || !hashPattern.test(body.transaction_hash)) throw fail('A valid creation transaction hash is required.')
      const hash = body.transaction_hash.toLowerCase()
      const address = contractAddress()
      if (!address || !process.env.SEPOLIA_RPC_URL) throw fail('Shipment receipt verification is not configured.', 503)
      const rpc = provider()
      if ((await rpc.getNetwork()).chainId !== 11155111n) throw fail('Receipt verification requires Sepolia.', 503)
      const receipt = await rpc.getTransactionReceipt(hash)
      if (!receipt || receipt.status !== 1) throw fail('The transaction is not confirmed successfully. Retry after confirmation.', 409)
      const events = receipt.logs.filter((log) => log.address.toLowerCase() === address.toLowerCase()).map((log) => { try { return eventInterface.parseLog(log) } catch { return null } }).filter((event) => event?.name === 'AgreementCreated')
      if (events.length !== 1) throw fail('This transaction must create exactly one VeriCargo agreement.')
      const event = events[0].args
      if (event.agreementId.toString() !== String(body.agreement_id)) throw fail('Agreement ID does not match the confirmed transaction.')
      if (event.shipper.toLowerCase() !== shipper.wallet_address.toLowerCase()) throw fail('This agreement does not belong to your verified wallet.', 403)
      const { data: carrier, error: carrierError } = await database().from('users').select('id, role, wallet_verified_at').ilike('wallet_address', event.carrier).maybeSingle()
      dbError(carrierError)
      if (!carrier || carrier.role?.toLowerCase() !== 'carrier' || !carrier.wallet_verified_at) throw fail('The agreement carrier has no verified carrier account.', 409)
      const existing = async () => {
        const { data, error } = await database().from('shipments').select('*').eq('agreement_id', body.agreement_id).eq('shipper_user_id', userId).maybeSingle()
        dbError(error)
        if (data && data.creation_transaction_hash !== hash) throw fail('Agreement already has shipment information.', 409)
        return data
      }
      const saved = await existing()
      if (saved) return saved
      const { data, error } = await database().from('shipments').insert({ ...details, shipper_user_id: userId, agreement_id: event.agreementId.toString(), carrier_user_id: carrier.id, creation_transaction_hash: hash }).select().single()
      if (error?.code === '23505') {
        const concurrent = await existing()
        if (concurrent) return concurrent
      }
      dbError(error)
      return data
    },
  }
}

module.exports = { createShipmentService, validateShipment, EVENT }
