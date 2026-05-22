import axios from 'axios';

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
    const token = window.localStorage.getItem('connect_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const method = error?.config?.method?.toUpperCase?.() || 'REQUEST';
    const url = `${error?.config?.baseURL || ''}${error?.config?.url || ''}`;
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error?.message || 'Unknown API error';

    console.error(`[API request failed] ${method} ${url} ${status || ''} ${message}`);

    return Promise.reject(error);
  },
);

export default apiClient;
