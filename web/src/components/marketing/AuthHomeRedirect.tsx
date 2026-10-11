"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchMe } from "@/src/lib/api";

export function AuthHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    fetchMe()
      .then((user) => {
        if (!mounted) return;
        if (user && user.authType !== "guest") {
          router.replace("/my-account");
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [router]);

  return null;
}
