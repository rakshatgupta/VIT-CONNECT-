import axios from 'axios';

// API Backend for Auth (Switched back to Node.js)
export const authApi = axios.create({
  baseURL: 'http://localhost:5000/api/auth'
});

// Node Backend for Core Logic
export const coreApi = axios.create({
  baseURL: 'http://localhost:5000/api'
});

coreApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
