import axios from 'axios';
import { api } from './api';

export interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  website?: string;
}

export async function sendContactQuery(payload: ContactPayload) {
  try {
    // 1. Try Next.js internal API route first (/api/contact)
    const localRes = await axios.post('/api/contact', payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });
    return localRes.data;
  } catch (localErr: unknown) {
    // If local route handler failed, fallback to NestJS backend
    const errMsg = localErr instanceof Error ? localErr.message : String(localErr);
    console.warn('[Contact] Local route fallback to backend:', errMsg);
    const res = await api.post('/contact', payload);
    return res.data;
  }
}

export function getApiErrorMessage(err: unknown): string {
  const axiosErr = err as { response?: { data?: { message?: string | string[] } }; message?: string };
  const message = axiosErr?.response?.data?.message || axiosErr?.message;
  if (Array.isArray(message)) {
    return message.join(', ');
  }
  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }
  return 'Something went wrong. Please try again.';
}
