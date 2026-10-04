'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMe } from '@/src/lib/api';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function determineRoute() {
      try {
        const data = await fetchMe();
        const memberships = data?.memberships || [];

        if (memberships.length === 0) {
          router.replace('/register-company');
          return;
        }

        const savedCompany = typeof window !== 'undefined' ? localStorage.getItem('lastCompany') : null;
        if (savedCompany && memberships.some((m: any) => m.companySlug === savedCompany)) {
          router.replace(`/${savedCompany}/dashboard`);
          return;
        }

        if (memberships.length === 1) {
          const onlySlug = memberships[0].companySlug;
          if (typeof window !== 'undefined') {
            localStorage.setItem('lastCompany', onlySlug);
          }
          router.replace(`/${onlySlug}/dashboard`);
          return;
        }

        // Multiple memberships and none saved in localStorage
        router.replace('/select-company');
      } catch (err: any) {
        console.error('Failed to resolve tenant landing page:', err);
        router.replace('/register-company');
      }
    }

    determineRoute();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Redirecting to your workspace...</p>
      </div>
    </div>
  );
}
