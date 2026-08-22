import { useEffect } from 'react'

const statusContent = {
  success: { eyebrow: 'Success', title: 'Everything is ready', icon: '✓' },
  error: { eyebrow: 'Something went wrong', title: 'Action could not be completed', icon: '!' },
  random: { eyebrow: 'A little surprise', title: 'You are cleared for takeoff', icon: '✦' },
}

export function Popup({
  variant = 'success',
  title,
  message,
  actionLabel,
  onAction,
  onClose,
  autoCloseMs = 3500,
}) {
  const content = statusContent[variant] || statusContent.success
  const hasAction = Boolean(actionLabel && onAction)

  useEffect(() => {
    if (hasAction || !autoCloseMs) return undefined
    const timer = setTimeout(onClose, autoCloseMs)
    return () => clearTimeout(timer)
  }, [autoCloseMs, hasAction, onClose])

  return (
    <div className="app-popup__backdrop" role="presentation">
      <section className={`app-popup app-popup--${variant}`} role="dialog" aria-modal="true" aria-labelledby="app-popup-title">
        {onClose && <button className="app-popup__close" type="button" onClick={onClose} aria-label="Close popup">&times;</button>}
        <div className="app-popup__icon" aria-hidden="true">{content.icon}</div>
        <span className="app-popup__eyebrow">{content.eyebrow}</span>
        <h2 id="app-popup-title">{title || content.title}</h2>
        {message && <p>{message}</p>}
        {hasAction && <button className="app-popup__action" type="button" onClick={onAction}>{actionLabel}</button>}
      </section>
    </div>
  )
}

export function ConfirmPopup({
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  return (
    <div className="app-popup__backdrop" role="presentation">
      <section className="app-popup app-popup--confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-popup-title">
        <div className="app-popup__icon" aria-hidden="true">?</div>
        <span className="app-popup__eyebrow">Please confirm</span>
        <h2 id="confirm-popup-title">{title}</h2>
        <p>{message}</p>
        <div className="app-popup__actions">
          <button className="app-popup__cancel" type="button" onClick={onCancel}>{cancelLabel}</button>
          <button className="app-popup__action" type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  )
}