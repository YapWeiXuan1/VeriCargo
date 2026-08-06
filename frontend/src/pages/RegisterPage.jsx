import '../styles/auth/AuthPage.css'
import { Link } from 'react-router-dom'
import { useRegisterForm } from '../hooks/useRegisterForm'
import { EyeIcon, EyeOffIcon } from '../components/icons' 

function RegisterPage() {
  const {
    formData,
    showPassword,
    showConfirmPassword,
    errors,
    submitError,
    loading,
    setShowPassword,
    setShowConfirmPassword,
    handleChange,
    handleRoleSelect,
    handleSubmit,
  } = useRegisterForm()

  return (
    <article className="auth-page auth-page--register" id="register">
      <div className="auth-page__glow auth-page__glow--top" aria-hidden="true" />
      <div className="auth-page__glow auth-page__glow--bottom" aria-hidden="true" />

      <section className="auth-page__hero auth-page__hero--alt">
        <span className="auth-badge">Create account</span>
        <h2>Set up your workspace in minutes</h2>
        <p>Join the platform, configure your business profile, and start managing products with a clean registration flow.</p>
      </section>

      <section className="auth-page__panel">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <fieldset className="auth-field auth-field--role">
            <legend>Select a Role</legend>
            <div className="auth-role-group" role="radiogroup" aria-label="Select your role">
              <label
                className={`auth-role-option ${formData.role === 'shipper' ? 'is-selected' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  handleRoleSelect('shipper')
                }}
              >
                <input type="radio" name="role" value="shipper" checked={formData.role === 'shipper'} readOnly />
                <span>
                  <strong>Shipper</strong>
                  <small>I manage products and shipping requests.</small>
                </span>
              </label>

              <label
                className={`auth-role-option ${formData.role === 'carrier' ? 'is-selected' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  handleRoleSelect('carrier')
                }}
              >
                <input type="radio" name="role" value="carrier" checked={formData.role === 'carrier'} readOnly />
                <span>
                  <strong>Carrier</strong>
                  <small>I transport and deliver shipments.</small>
                </span>
              </label>
            </div>
            {errors.role && <small className="auth-field__error">{errors.role}</small>}
          </fieldset>

          <label className="auth-field">
            <span>Full name</span>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Alex Morgan" />
            {errors.fullName && <small className="auth-field__error">{errors.fullName}</small>}
          </label>

          <label className="auth-field">
            <span>Company email</span>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="alex@company.com" />
            {errors.email && <small className="auth-field__error">{errors.email}</small>}
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-field__password-wrapper">
              <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="Create a password" />
              <button type="button" onClick={() => setShowPassword((p) => !p)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && <small className="auth-field__error">{errors.password}</small>}
          </label>

          <label className="auth-field">
            <span>Confirm password</span>
            <div className="auth-field__password-wrapper">
              <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat password" />
              <button type="button" onClick={() => setShowConfirmPassword((p) => !p)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.confirmPassword && <small className="auth-field__error">{errors.confirmPassword}</small>}
          </label>

          <label className="auth-check auth-check--stacked">
            <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} />
            <span>I agree to the terms and privacy policy for my new account.</span>
          </label>
          {errors.agreeTerms && <small className="auth-field__error">{errors.agreeTerms}</small>}

          <button className="auth-button auth-button--primary" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          {submitError && <p className="auth-field__error">{submitError}</p>}

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </article>
  )
}

export default RegisterPage