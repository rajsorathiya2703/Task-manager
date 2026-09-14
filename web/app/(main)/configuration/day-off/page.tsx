"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DayOffConfigRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dayoff/policies");
  }, [router]);

  return (
    <div className="flex justify-center items-center h-screen bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
