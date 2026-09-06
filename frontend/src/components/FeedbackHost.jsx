import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Popup } from './Popup'

export default function FeedbackHost() {
  const [notice, setNotice] = useState(null)
  useEffect(() => {
    const show = (event) => setNotice(event.detail)
    const invalid = (event) => {
      event.preventDefault()
      const input = event.target
      input.setAttribute('aria-invalid', 'true')
      setNotice({ variant: 'error', message: 'Please complete or correct the highlighted fields.', input, form: input.form })
    }
    const edited = (event) => {
      if (event.target.validity?.valid) event.target.removeAttribute('aria-invalid')
      if (event.target.form?.checkValidity && event.target.form.querySelector('[aria-invalid="true"]') === null) setNotice((current) => current?.form === event.target.form ? null : current)
    }
    window.addEventListener('vericargo:feedback', show)
    document.addEventListener('invalid', invalid, true)
    document.addEventListener('input', edited)
    return () => {
      window.removeEventListener('vericargo:feedback', show)
      document.removeEventListener('invalid', invalid, true)
      document.removeEventListener('input', edited)
    }
  }, [])
  if (!notice) return null
  if (notice.form) return createPortal(<p className="form-validation-summary" role="alert">{notice.message}</p>, notice.form)
  return <Popup variant={notice.variant} title={notice.title} message={notice.message} onClose={() => { setNotice(null); notice.input?.focus() }} />
}
