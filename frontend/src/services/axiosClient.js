// src/services/axiosClient.js
import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:5000/api', //backend base URL
  headers: {
    'Content-Type': 'application/json',
  },
});
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
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

export default axiosClient;