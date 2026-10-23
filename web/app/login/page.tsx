"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMe } from "@/src/lib/api";
import { LoginCard } from "@/src/components/auth/LoginCard";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    // If user is already authenticated with Google/account, direct to account/workspaces
    fetchMe()
      .then((user) => {
        if (!mounted) return;
        if (user && user.authType !== "guest") {
          router.replace("/my-account");
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        if (mounted) setChecking(false);
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#06100c]">
        <Loader2 className="w-8 h-8 animate-spin text-[#34d399]" />
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full">
      <LoginCard />
    </main>
  );
}
