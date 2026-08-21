// src/hooks/useLoginForm.js
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser } from '../services/axiosClient'

export function useLoginForm() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    if (!validate()) return

    setLoading(true)
    try {
      const res = await loginUser({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
      })
      const { token, user } = res.data
      if (formData.rememberMe) {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      } else {
        sessionStorage.setItem('token', token)
        sessionStorage.setItem('user', JSON.stringify(user))
      }
      if (user.role === 'shipper') {
        navigate('/shipperdashboard')
      } else {
        navigate('/carrierdashboard')
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return {
    formData,
    showPassword,
    errors,
    submitError,
    loading,
    setShowPassword,
    handleChange,
    handleSubmit,
  }
}