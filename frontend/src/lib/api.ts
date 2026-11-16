import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined' && !config.headers.get('Authorization')) {
    const token = localStorage.getItem('pix_token');
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return config;
});
