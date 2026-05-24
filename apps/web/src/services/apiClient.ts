import axios from 'axios';
import { clearAccessToken, getAccessToken } from './auth';

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
).replace(/\/api\/?$/, '');

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401 && typeof window !== 'undefined') {
      clearAccessToken();
      window.dispatchEvent(new Event('connect:unauthorized'));
    }

    return Promise.reject(error);
  },
);

export default apiClient;
