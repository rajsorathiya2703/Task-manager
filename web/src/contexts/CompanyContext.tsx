"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchMe, setCompanySlug, getCompanySlug } from '../lib/api';
import { peekCache } from '../lib/cache';

export interface CompanyMembership {
  roleIds: string[];
  isCompanyOwner: boolean;
  employeeId: string | null;
}

export interface CompanyContextValue {
  slug: string;
  companyName: string;
  membership: CompanyMembership | null;
  user: any | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

export interface CompanyProviderProps {
  slug: string;
  children: React.ReactNode;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ slug, children }) => {
  // Synchronously set company slug in the api module before children render
  if (slug) {
    setCompanySlug(slug);
  }

  // Synchronous cache inspection for instant initial state
  const cachedMe = typeof window !== 'undefined' ? peekCache<any>(`me:${slug || '_global'}`, 'local') : null;
  const initialUser = cachedMe || null;
  const initialMembership = cachedMe?.membership || null;
  const matchedCompany = cachedMe?.memberships?.find(
    (m: any) => m.companySlug?.toLowerCase() === slug.toLowerCase(),
  );
  const initialCompanyName = matchedCompany?.companyName || slug || '';

  const [companyName, setCompanyName] = useState<string>(initialCompanyName);
  const [membership, setMembership] = useState<CompanyMembership | null>(initialMembership);
  const [user, setUser] = useState<any | null>(initialUser);
  const [loading, setLoading] = useState<boolean>(!initialUser);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!slug) return;
    // Only show loading if we have no prior data
    if (!user) setLoading(true);
    try {
      setError(null);
      // Ensure the api client slug is set before network call
      setCompanySlug(slug);
      const data = await fetchMe(slug);
      if (data) {
        setUser(data);
        setMembership(data.membership || null);

        // Derive company name from user's memberships list if available
        const matched = data.memberships?.find(
          (m: any) => m.companySlug?.toLowerCase() === slug.toLowerCase(),
        );
        if (matched?.companyName) {
          setCompanyName(matched.companyName);
        } else {
          setCompanyName(slug);
        }
      }
    } catch (err: any) {
      setError(err);
      console.error(`[CompanyContext] Failed to load company (${slug}) data:`, err);
    } finally {
      setLoading(false);
    }
  }, [slug, user]);

  useEffect(() => {
    setCompanySlug(slug);
    refresh();
  }, [slug, refresh]);

  const value = React.useMemo<CompanyContextValue>(
    () => ({
      slug,
      companyName,
      membership,
      user,
      loading,
      error,
      refresh,
    }),
    [slug, companyName, membership, user, loading, error, refresh],
  );

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextValue => {
  const context = useContext(CompanyContext);
  if (!context) {
    // Provide a safe fallback if accessed outside of CompanyProvider (e.g. during transitions)
    const fallbackSlug = getCompanySlug();
    return {
      slug: fallbackSlug,
      companyName: fallbackSlug,
      membership: null,
      user: null,
      loading: false,
      error: null,
      refresh: async () => {},
    };
  }
  return context;
};
