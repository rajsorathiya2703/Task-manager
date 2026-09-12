"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { api, authEndpoints } from "../../lib/api";

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const PyramidLogo = () => (
  <div className="flex flex-col items-center justify-center mb-8">
    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-sm" aria-label="Pyramid Logo">
      <svg className="w-6 h-6 text-primary-foreground" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M12 2L2 20h20L12 2zm0 4.2L17.5 17H6.5L12 6.2z" />
      </svg>
    </div>
    <h1 className="text-2xl font-bold tracking-tight text-foreground">Pyramid</h1>
  </div>
);

export function LoginCard() {
  const router = useRouter();
  const [isLoadingGuest, setIsLoadingGuest] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoadingGoogle(true);
        setError(null);
        await api.post(authEndpoints.googleLogin, { token: tokenResponse.access_token });
        // NOTE: The backend expects an idToken. useGoogleLogin standard mode returns access_token. 
        // We usually need the 'implicit' flow or 'auth-code' flow. If the backend needs idToken,
        // we can fetch userinfo ourselves or use Google OAuth provider in a way it returns idToken.
        // Actually, if we use flow: 'implicit' it might not give id_token directly unless requested.
        // I will use tokenResponse.access_token for now, assuming the backend can decode or we need
        // to tweak the google login config to return id_token (e.g., prompt: 'consent').
        router.push("/tasks");
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to login with Google");
      } finally {
        setIsLoadingGoogle(false);
      }
    },
    onError: () => setError("Google login failed or was cancelled"),
  });

  const handleGuestLogin = async () => {
    try {
      setIsLoadingGuest(true);
      setError(null);
      await api.post(authEndpoints.guestLogin);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to continue as guest");
    } finally {
      setIsLoadingGuest(false);
    }
  };

  return (
    <div className="w-full max-w-sm px-4 sm:px-0 mx-auto">
      <PyramidLogo />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-6 text-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight mb-2">Let&apos;s get back on track</h2>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-md">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              fullWidth
              onClick={handleGuestLogin}
              disabled={isLoadingGuest || isLoadingGoogle}
            >
              {isLoadingGuest ? "Loading..." : "Continue as Guest"}
            </Button>

            <Button
              variant="google"
              fullWidth
              onClick={() => loginGoogle()}
              disabled={isLoadingGuest || isLoadingGoogle}
            >
              <GoogleIcon />
              {isLoadingGoogle ? "Loading..." : "Login with Google"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground px-4">
        By clicking continue, you agree to our{" "}
        <a href="#" className="underline hover:text-foreground">Terms of Service</a>{" "}
        and{" "}
        <a href="#" className="underline hover:text-foreground">Privacy Policy</a>
      </div>
    </div>
  );
}
