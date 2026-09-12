import axios from 'axios';
import { requestContext } from '../client/requestContext';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

/**
 * Shared Axios client for chatbot tool calls. Automatically attaches the
 * current user's JWT Bearer token via AsyncLocalStorage.
 */
export const chatbotApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

chatbotApiClient.interceptors.request.use((config) => {
  const ctx = requestContext.getStore();
  if (ctx?.accessToken) {
    config.headers['Authorization'] = `Bearer ${ctx.accessToken}`;
  }
  return config;
});

chatbotApiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    const status: number = err.response?.status;
    const msg: string =
      err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown error';
    if (status === 403) throw new Error(`Forbidden: ${msg}`);
    if (status === 401) throw new Error(`Unauthorized: ${msg}`);
    if (status === 404) throw new Error(`Not Found: ${msg}`);
    throw new Error(`API Error ${status ?? ''}: ${msg}`);
  },
);
