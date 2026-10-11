"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "sonner";

import { TimerProvider } from "../contexts/TimerContext";
import { AccessProvider } from "../contexts/AccessContext";
import { AccessErrorNotification } from "./access";

export function Providers({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "placeholder-client-id";
  
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <GoogleOAuthProvider clientId={clientId}>
        <AccessProvider>
          <TimerProvider>
            {children}
            <AccessErrorNotification />
            <Toaster position="top-right" richColors />
          </TimerProvider>
        </AccessProvider>
      </GoogleOAuthProvider>
    </NextThemesProvider>
  );
}
