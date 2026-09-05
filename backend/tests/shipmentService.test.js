const { test } = require('node:test')
const assert = require('node:assert/strict')
const { Interface } = require('ethers')
const { createShipmentService, validateShipment, EVENT } = require('../services/shipmentService')

const shipperWallet = '0x1111111111111111111111111111111111111111'
const carrierWallet = '0x2222222222222222222222222222222222222222'
const address = '0x3333333333333333333333333333333333333333'
const hash = `0x${'a'.repeat(64)}`
const details = { agreement_id: '42', transaction_hash: hash, cargo_name: 'Medical equipment', cargo_description: 'Sealed cartons', origin: 'Kuala Lumpur', destination: 'Penang', weight: '10.5', weight_unit: 'kg', quantity: '3', cargo_category: 'Equipment' }

function setup({ status = 1, chainId = 11155111n, logAddress = address, eventShipper = shipperWallet } = {}) {
  const rows = { users: [
    { id: 1, role: 'Shipper', wallet_address: shipperWallet, wallet_verified_at: '2026-01-01' },
    { id: 2, role: 'Carrier', wallet_address: carrierWallet, wallet_verified_at: '2026-01-01' },
    { id: 3, role: 'Shipper', wallet_address: '0x4444444444444444444444444444444444444444', wallet_verified_at: '2026-01-01' },
  ], shipments: [] }
  let rejectInsert = false
  const database = () => ({ from(table) {
    let predicates = [], mutation, payload
    const query = {
      select() { return this },
      eq(k, v) { predicates.push((r) => String(r[k]) === String(v)); return this },
      neq(k, v) { predicates.push((r) => r[k] !== v); return this },
      is(k, v) { predicates.push((r) => (r[k] ?? null) === v); return this },
      ilike(k, v) { predicates.push((r) => r[k]?.toLowerCase() === v.toLowerCase()); return this },
      or(expression) { const terms = expression.split(',').map((term) => term.split('.eq.')); predicates.push((r) => terms.some(([k, v]) => String(r[k]) === v)); return this },
      order() { return this }, limit() { return this },
      insert(value) { mutation = 'insert'; payload = value; return this },
      update(value) { mutation = 'update'; payload = value; return this },
      execute(single) {
        let data = rows[table].filter((r) => predicates.every((predicate) => predicate(r)))
        if (mutation === 'insert') {
          if (rejectInsert) return { error: { code: 'unavailable' } }
          data = [{ id: 'shipment-id', shipment_reference: 'VCG-2026-000001', ...payload }]; rows[table].push(...data)
        }
        return { data: single ? data[0] || null : data, error: null }
      },
      single() { return Promise.resolve(this.execute(true)) }, maybeSingle() { return Promise.resolve(this.execute(true)) },
      then(resolve, reject) { return Promise.resolve(this.execute(false)).then(resolve, reject) },
    }
    return query
  } })
  const log = new Interface([EVENT]).encodeEventLog(new Interface([EVENT]).getEvent('AgreementCreated'), [42n, eventShipper, carrierWallet, 100n, 2000000000n])
  process.env.SEPOLIA_RPC_URL = 'http://localhost:8545'
  const service = createShipmentService({ database, contractAddress: () => address, provider: () => ({ getNetwork: async () => ({ chainId }), getTransactionReceipt: async () => ({ status, logs: [{ ...log, address: logAddress }] }) }) })
  return { service, rows, failInserts: (value) => { rejectInsert = value } }
}

test('validates quantities, metadata and ignores forged ownership', () => {
  assert.equal(validateShipment({ ...details, shipper_user_id: 3 }).shipper_user_id, undefined)
  for (const bad of [{ quantity: 0 }, { quantity: 1.5 }, { weight: Infinity }, { weight: {} }, { weight_unit: 'unknown' }, { cargo_name: ' ' }, { cargo_description: 'x'.repeat(2001) }]) assert.throws(() => validateShipment({ ...details, ...bad }))
})
test('inserts only confirmed records, derives owners and retries idempotently', async () => {
  const { service, rows } = setup()
  const saved = await service.create(1, { ...details, shipper_user_id: 3, carrier_user_id: 3 })
  assert.equal(saved.shipper_user_id, 1)
  assert.equal(saved.carrier_user_id, 2)
  assert.equal(saved.agreement_id, '42')
  assert.equal(saved.creation_transaction_hash, hash)
  assert.equal(Object.hasOwn(saved, 'link_status'), false)
  await service.create(1, details)
  assert.equal(rows.shipments.length, 1)
  await assert.rejects(service.create(2, details), { statusCode: 403 })
  assert.equal((await service.forAgreement(1, 42)).id, saved.id)
  assert.equal((await service.forAgreement(2, 42)).id, saved.id)
  assert.equal(await service.forAgreement(3, 42), null)
})
test('rejects failed, wrong-network, foreign-contract and foreign-owner receipts without inserts', async () => {
  for (const options of [{ status: 0 }, { chainId: 1n }, { logAddress: carrierWallet }, { eventShipper: carrierWallet }]) {
    const { service, rows } = setup(options)
    await assert.rejects(service.create(1, details))
    assert.equal(rows.shipments.length, 0)
  }
})
test('rejects missing or mismatched agreement identifiers without inserts', async () => {
  const { service, rows } = setup()
  for (const agreement_id of [null, undefined, '99', '-1']) await assert.rejects(service.create(1, { ...details, agreement_id }))
  assert.equal(rows.shipments.length, 0)
})
test('save failure creates no record; retry saves the same confirmed agreement', async () => {
  const { service, rows, failInserts } = setup()
  failInserts(true)
  await assert.rejects(service.create(1, details), { statusCode: 503 })
  assert.equal(rows.shipments.length, 0)
  failInserts(false)
  assert.equal((await service.create(1, details)).agreement_id, '42')
  await service.create(1, details)
  assert.equal(rows.shipments.length, 1)
})
