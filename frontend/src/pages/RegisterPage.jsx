import '../styles/auth/AuthPage.css'
import { Link } from 'react-router-dom'
import MetaMaskConnectButton from '../components/metaMaskConnectButton.jsx'

function RegisterPage() {
  return (
    <article className="auth-page auth-page--register" id="register">
      <div className="auth-page__glow auth-page__glow--top" aria-hidden="true" />
      <div className="auth-page__glow auth-page__glow--bottom" aria-hidden="true" />

      <section className="auth-page__hero auth-page__hero--alt">
        <span className="auth-badge">Create account</span>
        <h2>Set up your workspace in minutes</h2>
        <p>
          Join the platform, configure your business profile, and start
          managing products with a clean registration flow.
        </p>

        <div className="auth-steps" aria-label="Registration highlights">
          <div>
            <strong>Step 01</strong>
            <span>Personal details</span>
          </div>
          <div>
            <strong>Step 02</strong>
            <span>Business setup</span>
          </div>
          <div>
            <strong>Step 03</strong>
            <span>Start shipping</span>
          </div>
        </div>
      </section>

      <section className="auth-page__panel">
        <div className="auth-panel__header">
          <span className="auth-panel__eyebrow">Register</span>
          <h3>Create your account</h3>
          <p>Enter your details to open a new VeriCargo account.</p>
        </div>

        <form className="auth-form">
          <label className="auth-field">
            <span>Full name</span>
            <input type="text" placeholder="Alex Morgan" />
          </label>

          <label className="auth-field">
            <span>Company email</span>
            <input type="email" placeholder="alex@company.com" />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input type="password" placeholder="Create a password" />
          </label>

          <label className="auth-field">
            <span>Confirm password</span>
            <input type="password" placeholder="Repeat password" />
          </label>

          <label className="auth-check auth-check--stacked">
            <input type="checkbox" />
            <span>
              I agree to the terms and privacy policy for my new account.
            </span>
          </label>

          <button className="auth-button auth-button--primary" type="submit">
            Create account
          </button>

          <MetaMaskConnectButton />

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </article>
  )
}

export default RegisterPage