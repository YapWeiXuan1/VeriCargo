import { formatEther } from 'ethers'
import { dateTime } from '../services/escrowService'
import '../styles/milestone-stepper.css'

function milestoneState(milestone, agreement) {
  if (milestone.verified) return ['complete', 'Verified · payment released', '✓']
  if (agreement.status >= 3) return ['locked', 'Closed · not released', '−']
  if (milestone.rejected) return ['rejected', 'Rejected · resubmission required', '!']
  if (milestone.proofSubmittedAt) return ['review', 'Awaiting shipper review', '↻']
  if (agreement.status > 0 && milestone.index === agreement.nextProofIndex) return ['current', 'Awaiting carrier proof', '•']
  return ['locked', 'Not started · locked', '−']
}

function nextAction(agreement) {
  if (agreement.status === 3) return 'Agreement completed. All milestone payments have been released.'
  if (agreement.status === 4) return 'Agreement closed. The remaining escrow has been refunded.'
  if (agreement.status === 0) return 'Shipper: fund this agreement from Funding & refunds to activate it.'
  const review = agreement.milestones.find((m) => m.index === agreement.nextVerificationIndex && m.proofSubmittedAt && !m.verified && !m.rejected)
  if (review) return `Shipper: review proof for “${review.description}” from Review proofs. Review deadline: ${dateTime(review.proofSubmittedAt + 259200)}.`
  if (agreement.deadline < Date.now() / 1000) return agreement.pendingProofCount > 0
    ? 'The proof deadline has passed. Resolve outstanding proofs before requesting a refund.'
    : 'The proof deadline has passed. Check Funding & refunds for the remaining escrow.'
  const rejected = agreement.milestones.find((m) => m.rejected && !m.verified)
  if (rejected) return `Carrier: resubmit proof for “${rejected.description}”.`
  const next = agreement.milestones.find((m) => m.index === agreement.nextProofIndex && !m.verified)
  return next ? `Carrier: submit proof for “${next.description}”.` : 'Awaiting completion of the remaining milestone reviews.'
}

export default function MilestoneStepper({ agreement }) {
  return <section className="milestone-progress" aria-label={`Agreement ${agreement.id} milestones`}>
    <ol className="milestone-timeline">
      {agreement.milestones.map((milestone, index) => {
        const [state, label, symbol] = milestoneState(milestone, agreement)
        const value = index === agreement.milestones.length - 1
          ? agreement.totalValue - agreement.milestones.slice(0, -1).reduce((sum, m) => sum + agreement.totalValue * BigInt(m.percent) / 100n, 0n)
          : agreement.totalValue * BigInt(milestone.percent) / 100n
        return <li key={milestone.index} className={`milestone-timeline__step milestone-timeline__step--${state}`}>
          <span className="milestone-timeline__node" aria-hidden="true">{state === 'current' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10M7 5l9 4" /></svg> : symbol}</span>
          <div className="milestone-timeline__card"><small>Milestone {index + 1}</small><h3>{milestone.description}</h3><div className="milestone-timeline__value"><b>{milestone.percent}% release</b><span>{formatEther(value)} ETH</span></div><strong className="milestone-timeline__status">{label}</strong></div>
        </li>
      })}
    </ol>
    <div className="milestone-progress__action"><strong>Next required action</strong><p>{nextAction(agreement)}</p></div>
  </section>
}
