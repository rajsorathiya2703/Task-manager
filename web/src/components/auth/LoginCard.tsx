"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { api, authEndpoints, fetchMembershipStatus } from "../../lib/api";
import { Building2, Loader2 } from "lucide-react";

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

export interface LoginCardProps {
  companyName?: string;
  logoUrl?: string;
  slug?: string;
}

export function LoginCard({ companyName, logoUrl, slug }: LoginCardProps) {
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

        if (slug) {
          try {
            const status = await fetchMembershipStatus(slug);
            if (status?.isMember) {
              try {
                localStorage.setItem("lastCompany", slug);
              } catch {}
              router.push(`/${slug}/dashboard`);
            } else {
              router.push(`/${slug}/join`);
            }
          } catch {
            router.push(`/${slug}/join`);
          }
        } else {
          window.location.href = "/my-account";
        }
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
      router.push(slug ? `/${slug}/dashboard` : "/tasks");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to continue as guest");
    } finally {
      setIsLoadingGuest(false);
    }
  };

  const isCompanyLogin = !!slug;

  return (
    <div className="w-full max-w-sm px-4 sm:px-0 mx-auto">
      {/* Brand Header */}
      {isCompanyLogin ? (
        <div className="flex flex-col items-center justify-center mb-8">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName || "Company Logo"}
              className="w-14 h-14 rounded-2xl object-cover mb-4 border border-border shadow-sm"
            />
          ) : (
            <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-4 text-primary shadow-xs">
              <Building2 className="w-7 h-7" />
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-foreground text-center">
            {companyName || "Pyramid Workspace"}
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">/{slug}</p>
        </div>
      ) : (
        <PyramidLogo />
      )}

      <Card className="mb-6 shadow-md border-border">
        <CardContent className="flex flex-col gap-6 text-center p-6 sm:p-8">
          <div>
            <h2 className="text-xl font-bold tracking-tight mb-2 text-foreground">
              {companyName ? `Sign in to ${companyName}` : "Let's get back on track"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {companyName
                ? "Sign in with your Google account to access this company workspace"
                : "Sign in to your account to continue"}
            </p>
          </div>

          {error && (
            <div className="p-3 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl text-left">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {!isCompanyLogin && (
              <Button
                variant="primary"
                fullWidth
                onClick={handleGuestLogin}
                disabled={isLoadingGuest || isLoadingGoogle}
                className="h-11 rounded-xl shadow-xs"
              >
                {isLoadingGuest ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Continue as Guest"
                )}
              </Button>
            )}

            <Button
              variant="google"
              fullWidth
              onClick={() => loginGoogle()}
              disabled={isLoadingGuest || isLoadingGoogle}
              className="h-11 rounded-xl shadow-xs gap-2"
            >
              {isLoadingGoogle ? (
                <Loader2 className="w-4 h-4 animate-spin text-foreground" />
              ) : (
                <GoogleIcon />
              )}
              <span className="font-semibold text-sm">Sign in with Google</span>
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
