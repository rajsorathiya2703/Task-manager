"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { api, authEndpoints, fetchMembershipStatus, fetchMe } from "../../lib/api";
import { Building2, Loader2, ArrowRight } from "lucide-react";

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const CubeLogoIcon = () => (
  <svg
    className="w-5 h-5 text-white"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

export interface LoginCardProps {
  companyName?: string;
  logoUrl?: string;
  slug?: string;
}

const FEATURE_TAGS = [
  "Task boards",
  "Time tracking",
  "AI Copilot",
  "Leave management",
];

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
              } catch { }
              router.push(`/${slug}/dashboard`);
            } else {
              router.push(`/${slug}/join`);
            }
          } catch {
            router.push(`/${slug}/join`);
          }
        } else {
          try {
            const user = await fetchMe(undefined, { fresh: true });
            if (
              user?.subscription?.status === "no_company" &&
              (!user?.memberships || user.memberships.length === 0)
            ) {
              window.location.href = "/register-company";
            } else {
              window.location.href = "/tasks";
            }
          } catch {
            window.location.href = "/tasks";
          }
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
    <div className="home-theme-scope min-h-screen w-full flex flex-col lg:flex-row">
      {/* Left Pane: Cybernetic Pine (DESIGN (2).md) */}
      <div className="relative w-full lg:w-[48%] xl:w-[46%] bg-[#0a1514] flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden min-h-[460px] lg:min-h-screen border-r border-[#285A48]/50">
        {/* Ambient mint glow */}
        <div
          className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-[#408A71]/25 via-[#1B332B]/30 to-transparent blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          {isCompanyLogin ? (
            <>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={companyName || "Company Logo"}
                  className="w-10 h-10 rounded-xl object-cover border border-[#285A48] shadow-xs"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#1B332B] border border-[#285A48] flex items-center justify-center text-[#8bd5b9] shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
              )}
              <div>
                <span className="text-[#E3F5EC] font-['Space_Grotesk',sans-serif] font-bold text-lg tracking-tight block">
                  {companyName || "Own Technology"}
                </span>
                {slug && <span className="text-xs font-['JetBrains_Mono',monospace] text-[#8bd5b9]/90">/{slug}</span>}
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-[#1B332B] border border-[#285A48] flex items-center justify-center text-[#8bd5b9] shadow-xs">
                <CubeLogoIcon />
              </div>
              <span className="text-[#E3F5EC] font-['Space_Grotesk',sans-serif] font-bold text-lg tracking-tight">
                Own Technology
              </span>
            </>
          )}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 my-10 lg:my-auto max-w-xl">
          {/* Secure sign in chip (DESIGN (2).md: JetBrains Mono + #1B332B / #285A48 / #B0E4CC) */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-['JetBrains_Mono',monospace] font-medium bg-[#1B332B] text-[#B0E4CC] border border-[#285A48] shadow-xs mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8bd5b9] animate-pulse" />
            <span>Secure sign in</span>
          </div>

          {/* Headline (Space Grotesk from DESIGN (2).md) */}
          <h1 className="font-['Space_Grotesk',sans-serif] text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1] mb-5">
            {companyName ? (
              <>
                <span className="text-[#E3F5EC]">Sign in to </span>
                <span className="text-[#B0E4CC] block mt-1">{companyName}</span>
              </>
            ) : (
              <>
                <span className="text-[#E3F5EC]">Let&apos;s get back </span>
                <span className="text-[#B0E4CC] block mt-1">on track</span>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="font-['Manrope',sans-serif] text-sm sm:text-base text-[#86A99A] font-normal leading-relaxed max-w-md mb-8">
            {companyName
              ? `Pick up where you left off with your team workspace on ${companyName}.`
              : "Pick up where you left off with your boards, time tracking and team, all in one workspace."}
          </p>

          {/* Feature Tags (DESIGN (2).md: JetBrains Mono + Cybernetic Pine tokens) */}
          <div className="flex flex-wrap gap-2.5">
            {FEATURE_TAGS.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-['JetBrains_Mono',monospace] font-medium bg-[#12211E] text-[#B0E4CC] border border-[#285A48] hover:bg-[#1B332B] hover:border-[#408A71] transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer info (desktop) */}
        <div className="relative z-10 hidden lg:block text-xs font-['JetBrains_Mono',monospace] text-[#86A99A]/70">
          © {new Date().getFullYear()} Own Technology. All rights reserved.
        </div>
      </div>

      {/* Right Pane: Warm Organic Editorial (DESIGN (1).md) */}
      <div className="relative flex-1 bg-[#f3fde8] flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 overflow-hidden min-h-[500px]">
        {/* Soft botanical ambient sage wash (DESIGN (1).md) */}
        <div
          className="absolute -top-24 -right-24 w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-[#c5d89d]/40 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#d6e5bb]/35 blur-2xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Tactile Card: Enclosed with hairline border and organic depth (DESIGN (1).md) */}
        <div className="w-full max-w-[410px] bg-[#ffffff] rounded-3xl p-8 sm:p-10 shadow-[0_16px_40px_-12px_rgba(35,43,30,0.08)] border border-[rgba(156,171,132,0.45)] relative z-10 flex flex-col">
          <div className="text-center mb-8">
            {/* Newsreader Editorial Heading */}
            <h2 className="font-['Newsreader',Georgia,serif] text-3xl sm:text-[2.1rem] font-medium tracking-tight text-[#161e12]">
              Welcome back
            </h2>
            {/* Manrope Analytical Subtitle */}
            <p className="font-['Manrope',sans-serif] text-xs sm:text-sm text-[#45483e] mt-2 font-normal">
              {companyName
                ? "Sign in with your Google account to continue"
                : "Sign in to your account to continue"}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 text-xs text-[#ba1a1a] bg-[#ffdad6]/60 border border-[#ba1a1a]/20 rounded-xl leading-relaxed text-left font-['Manrope',sans-serif]">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3.5">
            {!isCompanyLogin && (
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={isLoadingGuest || isLoadingGoogle}
                className="w-full h-12 bg-[#162217] hover:bg-[#233325] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-[#f3fde8] border border-[#55633d]/40 hover:border-[#89986d]/60 rounded-full font-['Manrope',sans-serif] font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                {isLoadingGuest ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#c5d89d]" />
                ) : (
                  <>
                    <span>Continue as guest</span>
                    <ArrowRight className="w-4 h-4 ml-0.5 text-[#c5d89d]" />
                  </>
                )}
              </button>
            )}

            {!isCompanyLogin && (
              <div className="relative my-2 flex items-center justify-center">
                <div className="border-t border-[rgba(156,171,132,0.35)] w-full" />
                <span className="bg-[#ffffff] px-3.5 text-[11px] font-['Manrope',sans-serif] uppercase tracking-wider text-[#76786d] font-semibold absolute">
                  or
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => loginGoogle()}
              disabled={isLoadingGuest || isLoadingGoogle}
              className="w-full h-12 bg-[#ffffff] hover:bg-[#f3fde8]/70 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none border border-[rgba(156,171,132,0.55)] hover:border-[#89986d] text-[#161e12] rounded-full font-['Manrope',sans-serif] font-semibold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer"
            >
              {isLoadingGoogle ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#55633d]" />
              ) : (
                <>
                  <GoogleIcon />
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Disclaimer (DESIGN (1).md: Manrope + #76786d + #55633d botanical links) */}
        <div className="text-center text-xs font-['Manrope',sans-serif] text-[#76786d] mt-6 max-w-xs leading-relaxed relative z-10">
          By clicking continue, you agree to our{" "}
          <a href="#" className="underline font-semibold text-[#55633d] decoration-[#89986d]/50 hover:text-[#161e12] hover:decoration-[#55633d] transition-colors">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline font-semibold text-[#55633d] decoration-[#89986d]/50 hover:text-[#161e12] hover:decoration-[#55633d] transition-colors">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}

