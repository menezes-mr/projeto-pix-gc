import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333',
  timeout: 10000,
});

// Interceptor para injetar o token em todas as requisições, caso ele exista no localStorage.
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pix_token');
    if (token) {
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        config.headers = { Authorization: `Bearer ${token}` } as any;
      }
    }
  }
  return config;
});
