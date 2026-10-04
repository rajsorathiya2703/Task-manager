"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchMe, setCompanySlug, getCompanySlug } from '../lib/api';

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

  const [companyName, setCompanyName] = useState<string>(slug || '');
  const [membership, setMembership] = useState<CompanyMembership | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
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
  }, [slug]);

  useEffect(() => {
    setCompanySlug(slug);
    refresh();
  }, [slug, refresh]);

  const value: CompanyContextValue = {
    slug,
    companyName,
    membership,
    user,
    loading,
    error,
    refresh,
  };

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
