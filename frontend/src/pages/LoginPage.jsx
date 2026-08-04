import '../styles/auth/AuthPage.css'
import { Link } from 'react-router-dom'
import { useLoginForm } from '../hooks/useLoginForm'

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0112 20c-6 0-10-7-10-7a19.6 19.6 0 015.06-5.94M9.9 4.24A10.4 10.4 0 0112 4c6 0 10 7 10 7a19.7 19.7 0 01-3.15 4.19M14.12 14.12a3 3 0 11-4.24-4.24" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}

function LoginPage() {
  const {
    formData,
    showPassword,
    errors,
    submitError,
    loading,
    setShowPassword,
    handleChange,
    handleSubmit,
  } = useLoginForm()

  return (
    <article className="auth-page auth-page--login" id="login">
      <div className="auth-page__glow auth-page__glow--top" aria-hidden="true" />
      <div className="auth-page__glow auth-page__glow--bottom" aria-hidden="true" />

      <section className="auth-page__hero">
        <span className="auth-badge">Secure sign in</span>
        <h2>Welcome back to your cargo dashboard</h2>
        <p>
          Access shipment updates, inventory tracking, and blockchain-verified
          records from one polished entry point.
        </p>

        <div className="auth-metrics" aria-label="Login benefits">
          <div>
            <strong>24/7</strong>
            <span>Tracking visibility</span>
          </div>
          <div>
            <strong>256-bit</strong>
            <span>Protected sessions</span>
          </div>
          <div>
            <strong>Live</strong>
            <span>Status sync</span>
          </div>
        </div>
      </section>

      <section className="auth-page__panel">
        <div className="auth-panel__header">
          <span className="auth-panel__eyebrow">Login</span>
          <h3>Sign in to continue</h3>
          <p>Use your existing credentials to jump back into VeriCargo.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span>Email address</span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@company.com"
            />
            {errors.email && <small className="auth-field__error">{errors.email}</small>}
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-field__password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && <small className="auth-field__error">{errors.password}</small>}
          </label>

          <div className="auth-form__row">
            <label className="auth-check">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button className="auth-button auth-button--primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          {submitError && <p className="auth-field__error">{submitError}</p>}


          <p className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </section>
    </article>
  )
}

export default LoginPage