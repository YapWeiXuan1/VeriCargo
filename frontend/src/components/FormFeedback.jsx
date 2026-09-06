export default function FormFeedback({ message, error, warning = false }) {
  const text = error || message
  if (!text) return null
  const tone = error ? 'error' : warning ? 'warning' : 'success'
  return <p className={`form-message form-message--${tone}`} role={error ? 'alert' : 'status'}>{text}</p>
}
