import { api } from './api';

export interface Company {
  _id: string;
  name: string;
  slug: string;
  industry: string;
  employeeCount: string;
  role: 'owner' | 'admin' | 'member';
  plan: string;
  trialEndsAt: string | Date;
  createdAt: string | Date;
}

export interface CreateCompanyPayload {
  name: string;
  industry: string;
  employeeCount: string;
  website?: string;
  phone?: string;
  country?: string;
}

export async function fetchMyCompanies(): Promise<Company[]> {
  const res = await api.get('/companies/mine');
  return res.data;
}

export async function createCompany(
  payload: CreateCompanyPayload,
): Promise<Company> {
  const res = await api.post('/companies', payload);
  return res.data;
}

export const ACTIVE_COMPANY_KEY = 'active_company';

export function setActiveCompany(
  company: Pick<Company, '_id' | 'slug' | 'name'>,
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      ACTIVE_COMPANY_KEY,
      JSON.stringify({
        _id: company._id,
        slug: company.slug,
        name: company.name,
      }),
    );
    document.cookie = `active_company=${company._id}; path=/; max-age=2592000; SameSite=Lax`;
  } catch (err) {
    console.error('Failed to set active company in storage:', err);
  }
}

export function getActiveCompanyId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_COMPANY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?._id) return parsed._id;
    }
    const match = document.cookie.match(/(?:^|;\s*)active_company=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch (err) {
    console.error('Failed to get active company id from storage:', err);
    return null;
  }
}

export function trialDaysLeft(trialEndsAt: string | Date): number {
  if (!trialEndsAt) return 0;
  const target = new Date(trialEndsAt).getTime();
  const now = Date.now();
  const diffMs = target - now;
  const wholeDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, wholeDays);
}

// When multi-company routing ships, change this to `/${company._id}/tasks`. This is the only place that knows the workspace URL.
export function getWorkspaceUrl(
  _company: Pick<Company, '_id'> | Company,
): string {
  return '/tasks';
}
