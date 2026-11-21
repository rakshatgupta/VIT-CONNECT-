import axios from 'axios';
import useAuthStore from './store/authStore';

export const authApi = axios.create({ baseURL: '/api/auth' });
export const coreApi = axios.create({ baseURL: '/api' });

coreApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

coreApi.interceptors.response.use(undefined, (error) => {
  const { token, logout } = useAuthStore.getState();
  if (token && error.response?.status === 401 && error.config?.headers?.Authorization === `Bearer ${token}`) {
    logout();
  }
  return Promise.reject(error);
});
