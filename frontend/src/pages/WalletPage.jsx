import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout'
import MetaMaskConnectButton from '../components/metaMaskConnectButton'
import useWallet from '../hooks/useWallet'
import useAgreements from '../hooks/useAgreements'
import { useAuth } from '../context/auth'
import { formatEthValue, loadWalletBalance } from '../services/escrowService'

export default function WalletPage() {
  const { user } = useAuth()
  const { account, isConnected, linkedAddress } = useWallet()
  const agreements = useAgreements(user?.role?.toLowerCase())
  const [balance, setBalance] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let active = true
    if (!isConnected || !account) { setBalance(null); return undefined }
    loadWalletBalance(account).then((value) => { if (active) setBalance(value) }).catch(() => { if (active) setBalance(null) })
    return () => { active = false }
  }, [account, isConnected])

  const payments = useMemo(() => agreements.agreements.flatMap((agreement) => agreement.milestones
    .filter((milestone) => milestone.verified && milestone.verifiedAt)
    .map((milestone) => ({
      key: `${agreement.id}-${milestone.index}`,
      agreementId: agreement.id,
      label: `Milestone ${milestone.index + 1}: ${milestone.description}`,
      timestamp: milestone.verifiedAt,
      date: new Date(milestone.verifiedAt * 1000).toLocaleString(),
      amount: (agreement.totalValue * BigInt(milestone.percent)) / 100n,
      incoming: user?.role?.toLowerCase() === 'carrier',
    }))).sort((a, b) => b.timestamp - a.timestamp), [agreements.agreements, user?.role])

  const pageCount = Math.max(1, Math.ceil(payments.length / 10))
  const visiblePayments = payments.slice((page - 1) * 10, page * 10)

  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])

  return <AppLayout title="Wallet" subtitle="Your Sepolia balance and VeriCargo payment activity.">
    <div className="profile-stack wallet-page">
      <section className={`wallet-card ${isConnected ? 'wallet-card--connected' : 'wallet-card--disconnected'}`}>
        <div>
          <span className="profile-card__eyebrow">Sepolia wallet</span>
          <h2>{isConnected && balance !== null ? `${formatEthValue(balance)} ETH` : 'Wallet not connected'}</h2>
          <p>{isConnected ? linkedAddress : 'Connect your registered MetaMask account to view your balance and payment activity.'}</p>
          {!isConnected && <div className="wallet-card__action"><MetaMaskConnectButton className="wallet-connect--wallet-card" /></div>}
        </div>
        <span className="wallet-card__network"><i /> Sepolia</span>
      </section>

      <section className="card profile-card">
        <div className="payment-history__header">
          <div><span className="profile-card__eyebrow">On-chain activity</span><h2>Payment history</h2></div>
          <span className="muted-copy">{payments.length} payments</span>
        </div>
        <div className="payment-history">
          {visiblePayments.map((payment) => <div className="payment-row" key={payment.key}><div><strong>{payment.label}</strong><span>Agreement #{payment.agreementId} · {payment.date}</span></div><b className={payment.incoming ? 'is-incoming' : ''}>{payment.incoming ? '+' : '−'}{formatEthValue(payment.amount)} ETH</b></div>)}
          {!visiblePayments.length && <p className="muted-copy">Verified milestone payments will appear here.</p>}
        </div>
        <div className="payment-pagination"><span>Showing {visiblePayments.length} of {payments.length}</span><div><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>
      </section>
    </div>
  </AppLayout>
}
