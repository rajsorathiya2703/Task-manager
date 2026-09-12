"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { TimerProvider } from "../contexts/TimerContext";
import { PermissionsProvider } from "../contexts/PermissionsContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "placeholder-client-id";
  
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <GoogleOAuthProvider clientId={clientId}>
        <PermissionsProvider>
          <TimerProvider>
            {children}
          </TimerProvider>
        </PermissionsProvider>
      </GoogleOAuthProvider>
    </NextThemesProvider>
  );
}

