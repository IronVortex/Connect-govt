import axios, { AxiosError, AxiosHeaders, AxiosRequestConfig } from 'axios';
import { clearAccessToken, getAccessToken, setAccessToken } from './auth';

const fallbackApiBaseUrl = 'https://connect-govt-api-ubki.onrender.com';

if (!process.env.NEXT_PUBLIC_API_URL) {
  console.error(
    'ERROR: NEXT_PUBLIC_API_URL environment variable is not set. '
    + `Falling back to ${fallbackApiBaseUrl}. `
    + 'Please configure it in your .env.local or deployment platform.'
  );
}

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL || fallbackApiBaseUrl
).replace(/\/api\/?$/, '');

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
};

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshToken() {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post(apiUrl('/auth/refresh'))
      .then((response) => {
        const accessToken = response.data?.access_token;
        if (accessToken) {
          setAccessToken(accessToken);
          return accessToken;
        }
        return null;
      })
      .catch(() => {
        clearAccessToken();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('connect:unauthorized'));
        }
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getAccessToken();
    if (token) {
      const headers = AxiosHeaders.from(config.headers ?? {});
      headers.set('Authorization', `Bearer ${token}`);
      config.headers = headers;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error?.response?.status;
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !String(originalRequest.url).includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      const newToken = await refreshToken();
      if (newToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
    }

    if (status === 401 && typeof window !== 'undefined') {
      clearAccessToken();
      window.dispatchEvent(new Event('connect:unauthorized'));
    }

    return Promise.reject(error);
  },
);

export default apiClient;
