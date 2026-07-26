import '../styles/auth/AuthPage.css'
import { Link } from 'react-router-dom'
import MetaMaskConnectButton from '../components/metaMaskConnectButton.jsx'

function LoginPage() {
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

        <form className="auth-form">
          <label className="auth-field">
            <span>Email address</span>
            <input type="email" placeholder="you@company.com" />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input type="password" placeholder="Enter your password" />
          </label>

          <div className="auth-form__row">
            <label className="auth-check">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#register">Forgot password?</a>
          </div>

          <button className="auth-button auth-button--primary" type="submit">
            Sign in
          </button>

          <MetaMaskConnectButton />

          <p className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </section>
    </article>
  )
}

export default LoginPage