// src/services/axiosClient.js
import axios from 'axios';

export function getAuthToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}

const axiosClient = axios.create({
  baseURL: 'http://localhost:5000/api', //backend base URL
  headers: {
    'Content-Type': 'application/json',
  },
});
axiosClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}` // attach it automatically
  }
  return config
})

export const registerUser = async (data) => {
  const response = await axiosClient.post('/auth/register', data);
  return response.data;
}
export const loginUser = async (data) => {
  const response = await axiosClient.post('/auth/login', data);
  return response.data;
}
export const updateProfile = async (data) => {
  const response = await axiosClient.put('/auth/profile', data)
  return response.data
}
export const resetPassword = async (data) => {
  const response = await axiosClient.post('/auth/reset-password', data)
  return response.data
}
export const searchCarriers = async (search) => {
  const response = await axiosClient.get('/carriers', { params: { search } })
  return response.data.carriers || []
}
export const uploadProofImage = async (file, agreementId, milestoneIndex) => {
  const imageData = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to read the proof image.'))
    reader.readAsDataURL(file)
  })
  const response = await axiosClient.post('/proofs', {
    imageData,
    mimeType: file.type,
    agreementId,
    milestoneIndex,
  })
  return response.data
}
export const getProofImageUrl = async (proofHash, agreementId, milestoneIndex) => {
  const response = await axiosClient.get(`/proofs/${proofHash}`, { params: { agreementId, milestoneIndex } })
  return response.data.url
}
export const getWalletStatus = async () => {
  const response = await axiosClient.get('/wallet/status')
  return response.data
}
export const requestWalletChallenge = async (walletAddress) => {
  const response = await axiosClient.post('/wallet/request-challenge', { walletAddress })
  return response.data
}
export const verifyWalletChallenge = async (challengeId, signature) => {
  const response = await axiosClient.post('/wallet/verify-challenge', { challengeId, signature })
  return response.data
}

export default axiosClient;
