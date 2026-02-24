import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import API_URL from './config';

const client = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT token on every request
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
client.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API ERROR]', {
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      message: error.message,
      code: error.code,
      status: error.response?.status,
    });
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default client;
