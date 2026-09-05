import { useState } from 'react'
import { downloadAgreementReport } from '../services/downloadAgreementReport'
import { Link, useParams } from 'react-router-dom'
import { formatEther } from 'ethers'
import AppLayout from '../components/AppLayout'
import { ContractNote, PageState, StatusPill, WalletAction } from '../components/AgreementUI'
import ShipmentInformationCard from '../components/ShipmentInformationCard'
import MilestoneStepper from '../components/MilestoneStepper'
import useAgreements from '../hooks/useAgreements'
import { dateTime } from '../services/escrowService'
import '../styles/main.css'
import '../styles/dashboard.css'
import '../styles/history-report.css'

export default function AgreementHistoryReport({ role }) {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const download = async () => {
    setDownloading(true); setDownloadError('')
    try { await downloadAgreementReport(agreement) }
    catch { setDownloadError('Unable to download the complete report. Please retry.') }
    finally { setDownloading(false) }
  }
  const { agreementId } = useParams()
  const data = useAgreements(role)
  const agreement = data.agreements.find((item) => String(item.id) === agreementId && item.status >= 3)
  const ready = data.isConnected && !data.loading && !data.error
  return <AppLayout title="Agreement report" subtitle="Completed and refunded shipment records." actions={<WalletAction />}>
    <div className="history-report__navigation"><Link className="panel-link" to={`/${role}/history`}>← Back to history</Link>
    <ContractNote /></div>
    <PageState loading={data.loading} error={data.error} connected={data.isConnected} />
    {ready && !agreement && <div className="card page-state" role="status">This history agreement is not available for your connected wallet.</div>}
    {ready && agreement && <div className="history-report__download-toolbar"><button type="button" className="btn btn--primary btn--compact" disabled={downloading} onClick={download} title="Download HTML report with Print / Save as PDF option">{downloading ? 'Preparing report...' : 'Download report'}</button></div>}
    {ready && agreement && <article className="card history-report">
      <header className="history-report__header"><div><span className="card-kicker">Agreement history</span><h2>Agreement #{agreement.id}</h2></div><div className="history-report__actions"><StatusPill status={agreement.status} /></div></header>
      {downloadError && <p className="form-message form-message--error" role="alert">{downloadError}</p>}
      <section className="history-report__section" aria-label="Escrow summary"><h3>Escrow summary <small>On-chain records · Sepolia</small></h3>
        <dl className="history-report__fields">
          <div><dt>Shipper wallet</dt><dd>{agreement.shipper}</dd></div><div><dt>Carrier wallet</dt><dd>{agreement.carrier}</dd></div>
          <div><dt>Proof deadline</dt><dd>{dateTime(agreement.deadline)}</dd></div><div><dt>Total agreement value</dt><dd>{agreement.totalEth} ETH</dd></div>
          <div><dt>Total funded</dt><dd>{formatEther(agreement.fundedAmount)} ETH</dd></div><div><dt>Payment released</dt><dd>{agreement.releasedEth} ETH</dd></div>
          {agreement.status === 4 && <div><dt>Refunded remainder</dt><dd>{formatEther(agreement.fundedAmount - agreement.releasedAmount)} ETH</dd></div>}
          <div><dt>Verified milestones</dt><dd>{agreement.verifiedMilestoneCount} of {agreement.milestones.length}</dd></div><div><dt>Pending proofs</dt><dd>{agreement.pendingProofCount}</dd></div>
        </dl>
      </section>
      <section className="history-report__section" aria-label="Shipment details"><h3>Shipment details</h3><ShipmentInformationCard key={agreement.id} agreementId={agreement.id} report /></section>
      <section className="history-report__section" aria-label="Milestone progress"><h3>Payment milestones</h3><MilestoneStepper agreement={agreement} /></section>
      <section className="history-report__section" aria-label="Proof records"><h3>Proof and verification records</h3><div className="history-report__proofs">{agreement.milestones.map((milestone) => <div className="history-report__proof" key={milestone.index}>
        <h4>{milestone.index + 1}. {milestone.description}</h4><dl className="history-report__fields"><div><dt>Proof submitted</dt><dd>{milestone.proofSubmittedAt ? dateTime(milestone.proofSubmittedAt) : 'Not submitted'}</dd></div><div><dt>Verified / released</dt><dd>{milestone.verifiedAt ? dateTime(milestone.verifiedAt) : 'Not verified'}</dd></div><div className="history-report__wide"><dt>On-chain proof hash</dt><dd>{milestone.proofHash || 'No proof recorded'}</dd></div></dl>
      </div>)}</div></section>
    </article>}
  </AppLayout>
}
