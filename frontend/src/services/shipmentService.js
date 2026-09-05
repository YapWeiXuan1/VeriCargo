import { Interface } from 'ethers'
import axiosClient from './axiosClient'

const events = new Interface(['event AgreementCreated(uint256 indexed agreementId,address indexed shipper,address indexed carrier,uint256 totalValue,uint256 deadline)'])
export function decodeShipmentAgreement(receipt) {
  const address = import.meta.env.VITE_CONTRACT_ADDRESS?.toLowerCase()
  const matches = receipt.logs.filter((log) => log.address.toLowerCase() === address).map((log) => {
    try { return events.parseLog(log) } catch { return null }
  }).filter((event) => event?.name === 'AgreementCreated')
  if (matches.length !== 1) throw new Error('The confirmed receipt could not be linked automatically. Retry saving shipment.')
  return matches[0].args.agreementId.toString()
}
export const saveShipment = async (details) => (await axiosClient.post('/shipments', details)).data.shipment
export const getAgreementShipment = async (id) => (await axiosClient.get(`/shipments/agreement/${id}`)).data.shipment
