import React from 'react';
import { CompanyProvider } from '@/src/contexts/CompanyContext';

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  return <CompanyProvider slug={companyId}>{children}</CompanyProvider>;
}
