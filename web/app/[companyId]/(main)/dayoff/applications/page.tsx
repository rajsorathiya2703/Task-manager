"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCompanyPath } from "@/src/lib/useCompanyPath";

export default function ApplicationsRedirectPage() {
  const router = useRouter();
  const cp = useCompanyPath();

  useEffect(() => {
    router.replace(cp("/dayoff/history"));
  }, [router, cp]);

  return (
    <div className="flex justify-center items-center h-screen bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
