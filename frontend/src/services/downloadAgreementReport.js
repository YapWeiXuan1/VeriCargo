import { formatEther } from 'ethers'
import { CONTRACT_ADDRESS, dateTime } from './escrowService'
import { getAgreementShipment } from './shipmentService'

const escape = (value) => String(value ?? 'Not provided').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const fields = (items) => `<dl>${items.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`

export async function downloadAgreementReport(agreement) {
  // Fetch first so a loading state or failed shipment request is never exported as a report.
  const shipment = await getAgreementShipment(agreement.id)
  const generated = new Date().toLocaleString()
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VeriCargo Agreement ${agreement.id}</title>
  <style>
  *{box-sizing:border-box}body{margin:0;background:#edf2f3;color:#19323c;font:14px/1.6 Arial,sans-serif}main{max-width:900px;margin:32px auto;padding:42px;background:white;border-top:6px solid #087f8c}header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #19323c;padding-bottom:20px}h1{font-size:26px;margin:4px 0}h2{font-size:17px;margin:26px 0 12px;color:#087f8c}p{margin:6px 0}.brand{font-size:12px;letter-spacing:2px;font-weight:bold}.status{align-self:flex-start;border:1px solid #a9bfc4;padding:5px 12px;border-radius:6px}dl{display:grid;grid-template-columns:1fr 1fr;gap:14px 24px;margin:0}dl>div{min-width:0;break-inside:avoid}dt{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#516b73}dd{margin:3px 0 0;overflow-wrap:anywhere}section{border-bottom:1px solid #dae3e6;padding-bottom:20px}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px}th,td{text-align:left;padding:9px 7px;border-bottom:1px solid #dae3e6;vertical-align:top;overflow-wrap:anywhere}th{background:#eef5f5}tr{break-inside:avoid}.proof{padding:12px 0;break-inside:avoid}.note,footer{color:#516b73;font-size:12px}footer{margin-top:24px}.tools{max-width:900px;margin:20px auto;text-align:right}button{padding:10px 16px;background:#087f8c;color:white;border:0;border-radius:6px;cursor:pointer}@media(max-width:600px){main{margin:0;padding:20px}dl{grid-template-columns:1fr}}@page{size:A4;margin:16mm}@media print{body{background:white}main{margin:0;padding:0;max-width:none}.tools{display:none}h2{break-after:avoid}thead{display:table-header-group}a{color:inherit}}
  </style></head><body><div class="tools"><button onclick="window.print()">Print / Save as PDF</button></div><main>
  <header><div><div class="brand">VERICARGO · AGREEMENT REPORT</div><h1>Agreement #${agreement.id}</h1><p class="note">Generated ${escape(generated)}</p></div><span class="status">${escape(agreement.statusName)}</span></header>
  <section><h2>Escrow summary</h2>${fields([
    ['Network', 'Sepolia'], ['Contract address', CONTRACT_ADDRESS], ['Shipper wallet', agreement.shipper], ['Carrier wallet', agreement.carrier],
    ['Proof deadline', dateTime(agreement.deadline)], ['Total agreement value', `${agreement.totalEth} ETH`], ['Total funded', `${formatEther(agreement.fundedAmount)} ETH`], ['Payment released', `${agreement.releasedEth} ETH`],
    ...(agreement.status === 4 ? [['Refunded remainder', `${formatEther(agreement.fundedAmount - agreement.releasedAmount)} ETH`]] : []),
    ['Verified milestones', `${agreement.verifiedMilestoneCount} of ${agreement.milestones.length}`], ['Pending proofs', agreement.pendingProofCount],
  ])}</section>
  <section><h2>Shipment information</h2><p class="note">Off-chain operational information. Not blockchain-verified.</p>${shipment ? fields([
    ['Shipment reference', shipment.shipment_reference], ['Cargo name', shipment.cargo_name], ['Description', shipment.cargo_description], ['Category', shipment.cargo_category], ['Origin', shipment.origin], ['Destination', shipment.destination], ['Weight', `${shipment.weight} ${shipment.weight_unit}`], ['Quantity', shipment.quantity], ['Handling instructions', shipment.handling_instructions], ['Tracking number', shipment.tracking_number], ['Shipment record ID', shipment.id], ['Creation transaction hash', shipment.creation_transaction_hash], ['Recorded', new Date(shipment.created_at).toLocaleString()], ['Last updated', new Date(shipment.updated_at).toLocaleString()],
  ]) : '<p>No shipment information is linked to this agreement.</p>'}</section>
  <section><h2>Payment milestones</h2><table><thead><tr><th>Milestone</th><th>Release</th><th>Amount (ETH)</th><th>Status</th></tr></thead><tbody>${agreement.milestones.map((milestone, index) => {
    const amount = index === agreement.milestones.length - 1 ? agreement.totalValue - agreement.milestones.slice(0, -1).reduce((sum, item) => sum + agreement.totalValue * BigInt(item.percent) / 100n, 0n) : agreement.totalValue * BigInt(milestone.percent) / 100n
    const status = milestone.verified ? 'Verified / payment released' : milestone.rejected ? 'Rejected / not released' : 'Closed / not released'
    return `<tr><td>${index + 1}. ${escape(milestone.description)}</td><td>${milestone.percent}%</td><td>${formatEther(amount)}</td><td>${status}</td></tr>`
  }).join('')}</tbody></table></section>
  <section><h2>Proof and verification records</h2>${agreement.milestones.map((milestone, index) => `<div class="proof"><strong>${index + 1}. ${escape(milestone.description)}</strong>${fields([['Proof submitted', milestone.proofSubmittedAt ? dateTime(milestone.proofSubmittedAt) : 'Not submitted'], ['Verified / released', milestone.verifiedAt ? dateTime(milestone.verifiedAt) : 'Not verified'], ['On-chain proof hash', milestone.proofHash]])}</div>`).join('')}</section>
  <footer>VeriCargo · Snapshot of agreement and shipment records at the time of export. Dates use the exporting browser's local time zone.</footer></main></body></html>`
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url; link.download = `VeriCargo-Agreement-${agreement.id}.html`
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
