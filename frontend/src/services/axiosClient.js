// src/services/axiosClient.js
import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:5000/api', //backend base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosClient;