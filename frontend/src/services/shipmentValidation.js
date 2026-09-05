export const emptyShipment = { cargo_name: '', cargo_description: '', origin: '', destination: '', weight: '', weight_unit: 'kg', quantity: '1', cargo_category: '', handling_instructions: '', tracking_number: '' }
export function validateShipmentDetails(value) {
  const errors = {}
  const limits = { cargo_name: 160, cargo_description: 2000, origin: 300, destination: 300, cargo_category: 100, handling_instructions: 2000, tracking_number: 160 }
  for (const [name, limit] of Object.entries(limits)) {
    if (typeof value[name] !== 'string' || value[name].trim().length > limit) errors[name] = `Use at most ${limit} characters.`
  }
  if (!['kg', 't', 'lb'].includes(value.weight_unit)) errors.weight_unit = 'Choose a valid weight unit.'
  for (const name of ['cargo_name', 'cargo_description', 'origin', 'destination', 'cargo_category']) {
    if (!value[name]?.trim()) errors[name] = 'This field is required.'
  }
  if (!Number.isFinite(Number(value.weight)) || Number(value.weight) <= 0 || Number(value.weight) > 1000000000) errors.weight = 'Enter a positive weight up to 1,000,000,000.'
  if (!Number.isInteger(Number(value.quantity)) || Number(value.quantity) <= 0 || Number(value.quantity) > 1000000000) errors.quantity = 'Enter a whole quantity from 1 to 1,000,000,000.'
  return errors
}
