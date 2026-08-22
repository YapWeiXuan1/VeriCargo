import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '../services/axiosClient'

export function useRegisterForm() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    agreeTerms: false,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [popup, setPopup] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  // clicking the already-selected role deselects it
  const handleRoleSelect = (roleValue) => {
    setFormData((prev) => ({
      ...prev,
      role: prev.role === roleValue ? '' : roleValue,
    }))
    setErrors((prev) => ({ ...prev, role: '' }))
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'

    if (!formData.email.trim()) {
      newErrors.email = 'Company email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      newErrors.password = 'Include at least one uppercase letter and one number'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.role) newErrors.role = 'Select a role to continue'
    if (!formData.agreeTerms) newErrors.agreeTerms = 'You must agree to the terms and privacy policy'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    if (!validate()) return

    setLoading(true)
    try {

      const res = await registerUser({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      })
      if (res.status === 500) {
        setSubmitError('Registration failed. Please try again.')
        setPopup({ variant: 'error', message: 'Registration failed. Please try again.', actionLabel: 'Try again' })
        return
      }

      setPopup({
        variant: 'success',
        title: 'Registration successful',
        message: 'Your VeriCargo account is ready. Sign in to continue setting up your workspace.',
        actionLabel: 'Continue to sign in',
      })

      // const { token, user } = res.data

      // // Store authentication data
      // localStorage.setItem('token', token)
      // localStorage.setItem('user', JSON.stringify(user))
      // localStorage.setItem('role', user.role)

      // // Redirect based on role
      // if (user.role === 'shipper') {
      //   navigate('/shipperdashboard')
      // } else {
      //   navigate('/carrierdashboard')
      // }
    } catch (err) {
      const message = err.response?.data?.error || 'Registration failed. Please try again.'
      setSubmitError(message)
      setPopup({ variant: 'error', message, actionLabel: 'Try again' })
    } finally {
      setLoading(false)
    }
  }

  const closePopup = () => {
    const wasSuccessful = popup?.variant === 'success'
    setPopup(null)
    if (wasSuccessful) navigate('/login', { state: { message: 'Registration successful! Please log in.' } })
  }

  return {
    formData,
    showPassword,
    showConfirmPassword,
    errors,
    submitError,
    popup,
    loading,
    setShowPassword,
    setShowConfirmPassword,
    handleChange,
    handleRoleSelect,
    handleSubmit,
    closePopup,
  }
}