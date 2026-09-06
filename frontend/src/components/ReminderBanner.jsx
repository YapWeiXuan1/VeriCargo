export default function ReminderBanner({ title, children }) {
  return <aside className="reminder-banner" role="note">
    <span className="reminder-banner__icon" aria-hidden="true">!</span>
    <div><strong>{title}</strong><p>{children}</p></div>
  </aside>
}
