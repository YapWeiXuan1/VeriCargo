import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import useAgreements from '../hooks/useAgreements'
import { dismissAllNotifications, dismissNotification, getNotifications, markAllNotificationsRead, markNotificationRead, syncNotifications } from '../services/axiosClient'

function ReminderIcon({ type }) {
  const paths = { wallet: 'M4 7h16v12H4zM4 10h16M16 14h2', fund: 'M12 3v18M16 7.5c0-1.4-1.8-2.5-4-2.5S8 6 8 7.5s1.8 2.5 4 2.5 4 1 4 2.5S14.2 15 12 15s-4-1.1-4-2.5', review: 'M4 5h16v14H4zM8 10l2 2 5-5M8 16h8', proof: 'M6 3h9l3 3v15H6zM14 3v4h4M9 13h6M9 17h4', claim: 'M12 8v5M12 17h.01M10 3h4l7 17H3z', refund: 'M4 8h11a5 5 0 010 10H8M4 8l4-4M4 8l4 4', waiting: 'M12 7v5l3 2M12 22a10 10 0 100-20 10 10 0 000 20z', info: 'M7 12l3 3 7-7M12 22a10 10 0 100-20 10 10 0 000 20z' }
  return <span className={`notification-icon notification-icon--${type}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[type] || paths.waiting} /></svg></span>
}

export default function WorkflowNotifications() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const role = user?.role?.toLowerCase()
  const data = useAgreements(role)
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const [stored, setStored] = useState([])
  const [now] = useState(() => Date.now() / 1000)
  const live = useMemo(() => {
    if (!data.isConnected) return []
    const items = []
    if (role === 'shipper') {
      const funding = data.agreements.filter((a) => a.status === 0)
      const reviews = data.agreements.filter((a) => a.milestones.some((m) => m.index === a.nextVerificationIndex && m.proofSubmittedAt && !m.verified && !m.rejected))
      const refunds = data.agreements.filter((a) => a.status > 0 && a.status < 3 && a.deadline < now && a.pendingProofCount === 0 && a.fundedAmount > a.releasedAmount)
      if (funding.length) items.push({ notificationKey: `fund:${funding.map((a) => a.id).join(',')}`, type: 'fund', title: `${funding.length} agreement${funding.length > 1 ? 's' : ''} awaiting funding`, detail: 'Action required: fund escrow to activate the agreement.', targetPath: '/shipper/funds', icon: 'fund' })
      if (reviews.length) items.push({ notificationKey: `review:${reviews.map((a) => a.id).join(',')}`, type: 'review', title: `${reviews.length} proof${reviews.length > 1 ? 's' : ''} awaiting review`, detail: 'Action required: verify or reject submitted milestone evidence.', targetPath: '/shipper/review', icon: 'review' })
      if (refunds.length) items.push({ notificationKey: `refund:${refunds.map((a) => a.id).join(',')}`, type: 'refund', title: `${refunds.length} refund${refunds.length > 1 ? 's' : ''} available`, detail: 'The deadline passed and escrow remains available to refund.', targetPath: '/shipper/funds', icon: 'refund' })
    } else if (role === 'carrier') {
      const proofItems = data.agreements.flatMap((a) => a.milestones.filter((m) => a.status > 0 && a.status < 3 && a.deadline >= now && !m.verified && (m.index === a.nextProofIndex || m.rejected)).map((m) => ({ a, m })))
      const dueToday = proofItems.filter(({ a }) => a.deadline - now <= 86400)
      const laterProofs = proofItems.filter(({ a }) => a.deadline - now > 86400)
      const claims = data.agreements.flatMap((a) => a.milestones.filter((m) => m.index === a.nextVerificationIndex && m.proofSubmittedAt && !m.verified && !m.rejected && now > m.proofSubmittedAt + 259200).map((m) => ({ a, m })))
      const waiting = data.agreements.filter((a) => a.status === 0)
      if (dueToday.length) items.push({ notificationKey: `proof-due-today:${dueToday.map(({ a, m }) => `${a.id}-${m.index}`).join(',')}`, type: 'proof', title: `${dueToday.length} proof${dueToday.length > 1 ? 's are' : ' is'} due today`, detail: 'Urgent: submit the milestone proof before today’s agreement deadline.', targetPath: '/carrier/proofs', icon: 'proof' })
      if (laterProofs.length) items.push({ notificationKey: `proof:${laterProofs.map(({ a, m }) => `${a.id}-${m.index}`).join(',')}`, type: 'proof', title: `${laterProofs.length} milestone proof${laterProofs.length > 1 ? 's' : ''} required`, detail: 'Action required: submit evidence before the agreement deadline.', targetPath: '/carrier/proofs', icon: 'proof' })
      if (claims.length) items.push({ notificationKey: `claim:${claims.map(({ a, m }) => `${a.id}-${m.index}`).join(',')}`, type: 'claim', title: `${claims.length} timeout claim${claims.length > 1 ? 's' : ''} available`, detail: 'Action available: the shipper review window has elapsed. Claim the milestone payment.', targetPath: '/carrier/claims', icon: 'claim' })
      if (waiting.length) items.push({ notificationKey: `waiting:${waiting.map((a) => a.id).join(',')}`, type: 'waiting', title: `${waiting.length} agreement${waiting.length > 1 ? 's' : ''} awaiting funding`, detail: 'The shipper still needs to fund escrow before work begins.', targetPath: '/carrier/agreements', icon: 'waiting' })
    }
    const completed = data.agreements.filter((agreement) => agreement.status === 3)
    if (completed.length) items.push({ notificationKey: `completed:${completed.map((agreement) => agreement.id).join(',')}`, type: 'info', title: `${completed.length} agreement${completed.length > 1 ? 's' : ''} completed`, detail: 'All milestones are verified and the agreement has been completed successfully.', targetPath: `/${role}/history`, icon: 'info' })
    const refunded = data.agreements.filter((agreement) => agreement.status === 4)
    if (refunded.length) items.push({ notificationKey: `refunded:${refunded.map((agreement) => agreement.id).join(',')}`, type: 'refund', title: `${refunded.length} agreement${refunded.length > 1 ? 's' : ''} refunded`, detail: 'The remaining escrow balance was refunded and the agreement is now closed.', targetPath: `/${role}/history`, icon: 'refund' })
    return items
  }, [data.agreements, data.isConnected, now, role])

  const normalize = (rows) => rows.map((row) => ({ id: row.id, notificationKey: row.notification_key, type: row.type, title: row.title, detail: row.detail, targetPath: row.target_path, createdAt: row.created_at, readAt: row.read_at }))

  useEffect(() => {
    let active = true
    if (user) getNotifications().then((rows) => { if (active) setStored(normalize(rows)) }).catch(() => {})
    return () => { active = false }
  }, [user])

  useEffect(() => {
    let active = true
    if (!data.loading && data.isConnected && user) syncNotifications(live).then((rows) => {
      if (active) setStored(normalize(rows))
    }).catch(() => {})
    return () => { active = false }
  }, [data.isConnected, data.loading, live, user])

  useEffect(() => {
    if (!open) return undefined
    const dismiss = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])

  const walletReminder = !data.isConnected ? [{ notificationKey: 'wallet-local', type: 'wallet', title: 'Connect MetaMask', detail: 'Connect your registered wallet to load on-chain agreements. Saved notifications remain available.', targetPath: '/wallet' }] : []
  const notifications = [...walletReminder, ...stored]
  const unreadCount = stored.filter((item) => !item.readAt).length + walletReminder.length
  const go = (item) => { if (item.id && !item.readAt) { const readAt = new Date().toISOString(); setStored((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt } : entry)); markNotificationRead(item.id).catch(() => {}) } setOpen(false); navigate(item.targetPath) }
  const clearOne = (event, item) => { event.stopPropagation(); setStored((current) => current.filter((entry) => entry.id !== item.id)); dismissNotification(item.id).catch(() => {}) }
  const markAllRead = () => { const readAt = new Date().toISOString(); setStored((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt }))); markAllNotificationsRead().catch(() => {}) }
  const clearAll = () => { setStored([]); dismissAllNotifications().catch(() => {}) }
  return <div className="notification-menu" ref={menuRef}><button className="notification-button" type="button" onClick={() => setOpen((value) => !value)} aria-label={`Notifications, ${unreadCount} unread`} aria-expanded={open}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M14 21h-4" /></svg>{unreadCount > 0 && <span>{unreadCount}</span>}</button>{open && <div className="notification-dropdown"><div className="notification-dropdown__heading"><div><strong>Workflow reminders</strong><small>{unreadCount} unread · {stored.length} saved</small></div>{stored.length > 0 && <div className="notification-heading-actions">{unreadCount > walletReminder.length && <button type="button" onClick={markAllRead}>Mark all read</button>}<button type="button" onClick={clearAll}>Clear all</button></div>}</div>{notifications.map((item) => <div className={`notification-row ${item.readAt ? 'is-read' : 'is-unread'}`} key={item.notificationKey}><button className="notification-row__content" type="button" onClick={() => go(item)}><ReminderIcon type={item.type} /><span className="notification-copy"><strong>{item.title}</strong><span>{item.detail}</span>{item.createdAt && <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>}</span><span className="notification-arrow" aria-hidden="true">›</span></button>{item.id && <button className="notification-row__clear" type="button" onClick={(event) => clearOne(event, item)} aria-label={`Clear ${item.title}`}>×</button>}</div>)}{!notifications.length && <p>You are all caught up.</p>}</div>}</div>
}
