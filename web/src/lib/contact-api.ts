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
  const res = await api.post('/contact', payload);
  return res.data;
}

export function getApiErrorMessage(err: any): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) {
    return message.join(', ');
  }
  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }
  return 'Something went wrong. Please try again.';
}
