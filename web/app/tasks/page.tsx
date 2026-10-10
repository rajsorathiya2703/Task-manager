"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchMyCompanies } from "@/src/lib/company-api";

export default function RootTasksRedirect() {
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("active_company");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.slug) {
          router.replace(`/${parsed.slug}/tasks`);
          return;
        }
      }
      const lastCompany = localStorage.getItem("lastCompany");
      if (lastCompany) {
        router.replace(`/${lastCompany}/tasks`);
        return;
      }
    } catch {}

    fetchMyCompanies()
      .then((companies) => {
        if (companies && companies.length > 0 && companies[0].slug) {
          router.replace(`/${companies[0].slug}/tasks`);
        } else {
          router.replace("/my-account");
        }
      })
      .catch(() => {
        router.replace("/my-account");
      });
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
