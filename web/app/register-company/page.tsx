"use client";

import Link from "next/link";
import { RegisterCompanyForm } from "@/src/components/company/RegisterCompanyForm";

const PyramidLogo = () => (
  <div className="flex flex-col items-center justify-center mb-6">
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
        <svg className="w-5 h-5 text-primary-foreground" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 20h20L12 2zm0 4.2L17.5 17H6.5L12 6.2z" />
        </svg>
      </div>
      <span className="text-xl font-bold tracking-tight text-foreground">Pyramid</span>
    </Link>
  </div>
);

export default function RegisterCompanyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl mx-auto">
        <PyramidLogo />
        <RegisterCompanyForm />
      </div>
    </div>
  );
}
