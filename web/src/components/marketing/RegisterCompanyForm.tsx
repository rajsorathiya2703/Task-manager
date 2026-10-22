"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Building2,
  ShieldCheck,
  Globe,
  Phone,
  MapPin,
  ChevronDown,
  Briefcase,
  Users,
  Check,
} from "lucide-react";
import { fetchMe, api, authEndpoints } from "../../lib/api";
import { createCompany, Company, setActiveCompany } from "../../lib/company-api";

const INDUSTRIES = [
  "Software/IT",
  "Manufacturing",
  "Retail",
  "Healthcare",
  "Education",
  "Finance",
  "Marketing and Media",
  "Consulting",
  "Other",
];

const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "500+"];

const FEATURE_TAGS = [
  "Task boards",
  "Time tracking",
  "AI Copilot",
  "Leave management",
];

const GoogleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export function RegisterCompanyForm() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [employeeCount, setEmployeeCount] = useState(EMPLOYEE_RANGES[0]);
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successCompany, setSuccessCompany] = useState<Company | null>(null);

  // 1. Session check on mount
  useEffect(() => {
    let mounted = true;
    fetchMe()
      .then((data) => {
        if (!mounted) return;
        if (data && data.authType === "google") {
          setUser(data);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
      })
      .finally(() => {
        if (mounted) setCheckingSession(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // 2. Google OAuth Login
  const loginGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoggingInGoogle(true);
        setAuthError(null);
        await api.post(authEndpoints.googleLogin, {
          token: tokenResponse.access_token,
        });
        const freshUser = await fetchMe();
        if (freshUser && freshUser.authType === "google") {
          setUser(freshUser);
        } else {
          setAuthError(
            "Google sign-in succeeded, but user account could not be verified.",
          );
        }
      } catch (err: any) {
        setAuthError(
          err?.response?.data?.message ||
            "Failed to complete Google authentication. Please try again.",
        );
      } finally {
        setIsLoggingInGoogle(false);
      }
    },
    onError: () => {
      setAuthError("Google sign-in was cancelled or encountered an error.");
    },
  });

  // 3. Form Validation
  const validate = () => {
    const errs: Record<string, string> = {};
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length < 2) {
      errs.name = "Company name must be at least 2 characters.";
    } else if (trimmedName.length > 100) {
      errs.name = "Company name cannot exceed 100 characters.";
    }

    if (website.trim()) {
      try {
        new URL(
          website.startsWith("http") ? website : `https://${website.trim()}`,
        );
      } catch {
        errs.website = "Please enter a valid website URL.";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // 4. Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      let formattedWebsite = website.trim();
      if (
        formattedWebsite &&
        !formattedWebsite.startsWith("http://") &&
        !formattedWebsite.startsWith("https://")
      ) {
        formattedWebsite = `https://${formattedWebsite}`;
      }

      const created = await createCompany({
        name: name.trim(),
        industry,
        employeeCount,
        website: formattedWebsite || undefined,
        phone: phone.trim() || undefined,
        country: country.trim() || undefined,
      });

      if (created) {
        setActiveCompany(created);
        router.replace("/dashboard");
        return;
      }
      setSuccessCompany(created);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setSubmitError(
          "This email has already used its free trial. Contact our sales team.",
        );
      } else {
        const msg = err?.response?.data?.message;
        setSubmitError(
          Array.isArray(msg)
            ? msg.join(", ")
            : msg || "Failed to register company. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initial loading state
  if (checkingSession) {
    return (
      <div className="bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] rounded-[32px] sm:rounded-[36px] p-12 text-center shadow-xl dark:shadow-[0_8px_32px_-4px_rgba(4,9,8,0.7)] flex flex-col items-center justify-center min-h-[360px] transition-colors duration-300">
        <div className="w-12 h-12 rounded-2xl bg-[#e6f4ed] dark:bg-[#1B332B] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center mb-4 border border-[#cbe8d8] dark:border-[#285A48] transition-colors">
          <Loader2 className="w-6 h-6 animate-spin text-[#086948] dark:text-[#8bd5b9]" />
        </div>
        <p className="font-home-body text-sm text-[#4B5750] dark:text-[#86A99A] font-medium">
          Checking your session...
        </p>
      </div>
    );
  }

  // Not signed in state or Guest user (Matching DESIGN (1) & DESIGN (2))
  if (!user || user.authType !== "google") {
    const isGuest = user?.authType === "guest";
    return (
      <div className="bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] rounded-[32px] sm:rounded-[36px] p-8 sm:p-11 text-center shadow-xl dark:shadow-[0_8px_32px_-4px_rgba(4,9,8,0.7)] max-w-md w-full mx-auto transition-colors duration-300">
        {/* Shield icon badge */}
        <div className="w-12 h-12 rounded-2xl bg-[#e6f4ed] dark:bg-[#1B332B] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center mx-auto mb-6 border border-[#cbe8d8] dark:border-[#285A48] shadow-2xs transition-colors">
          <ShieldCheck className="w-6 h-6 stroke-[2]" />
        </div>

        {/* Title */}
        <h2 className="font-home-heading text-2xl sm:text-[26px] font-bold tracking-tight text-[#161e12] dark:text-[#F3FDF8] text-center leading-snug">
          {isGuest
            ? "Sign in with Google to start a free trial"
            : "Sign in with Google to start your 14-day trial"}
        </h2>

        {/* Subtitle */}
        <p className="font-home-body text-xs sm:text-[13px] text-[#4B5750] dark:text-[#86A99A] leading-relaxed text-center max-w-xs mx-auto mt-2.5">
          {isGuest
            ? "Guest accounts cannot start a free trial. Please sign in with Google to register a company."
            : "Company registration requires a verified Google account to establish workspace ownership."}
        </p>

        {/* Auth Error Banner */}
        {authError && (
          <div
            role="alert"
            className="mt-5 p-3.5 rounded-2xl bg-[#ffdad6] dark:bg-[#1C1214] border border-[#ba1a1a]/20 dark:border-[#57252A] text-[#93000a] dark:text-[#ffb4ab] text-xs flex items-start gap-2.5 text-left font-home-body"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{authError}</div>
          </div>
        )}

        {/* Google Sign In Button */}
        <div className="mt-7">
          <button
            type="button"
            disabled={isLoggingInGoogle}
            onClick={() => loginGoogle()}
            className="w-full bg-[#161e12] hover:bg-[#2b3325] dark:bg-[#8bd5b9] dark:hover:bg-[#a6f2d4] text-white dark:text-[#091413] active:scale-[0.99] rounded-full h-13 px-6 inline-flex items-center justify-center font-semibold shadow-md dark:shadow-[0_0_24px_rgba(139,213,185,0.25)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#086948] dark:focus-visible:ring-[#8bd5b9] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed gap-3"
          >
            {isLoggingInGoogle ? (
              <Loader2 className="w-5 h-5 animate-spin text-white dark:text-[#091413]" />
            ) : (
              <>
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-2xs">
                  <GoogleIcon className="w-3.5 h-3.5" />
                </span>
                <span className="text-sm font-semibold tracking-wide">
                  Sign in with Google
                </span>
              </>
            )}
          </button>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-7 pt-1">
          {FEATURE_TAGS.map((tag) => (
            <span
              key={tag}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#e6f4ed] dark:bg-[#1B332B] text-[#086948] dark:text-[#8bd5b9] border border-[#cbe8d8] dark:border-[#285A48] transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>

        {isGuest && (
          <div className="mt-6 pt-4 border-t border-black/8 dark:border-[#285A48]">
            <Link
              href="/login"
              className="text-xs text-[#086948] dark:text-[#8bd5b9] font-semibold hover:underline"
            >
              Sign in with Google to start a free trial
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Success state
  if (successCompany) {
    const formattedDate = new Date(
      successCompany.trialEndsAt,
    ).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    return (
      <div className="bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] rounded-[32px] sm:rounded-[36px] p-8 sm:p-11 text-center shadow-xl dark:shadow-[0_8px_32px_-4px_rgba(4,9,8,0.7)] space-y-6 max-w-md w-full mx-auto transition-colors duration-300">
        <div className="w-16 h-16 rounded-2xl bg-[#e6f4ed] dark:bg-[#1B332B] border border-[#cbe8d8] dark:border-[#285A48] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="font-home-heading text-2xl font-bold tracking-tight text-[#161e12] dark:text-[#F3FDF8]">
            Your company {successCompany.name} is ready
          </h3>
          <p className="font-home-body text-[#4B5750] dark:text-[#86A99A] text-sm max-w-xs mx-auto leading-relaxed">
            Your free trial ends on{" "}
            <strong className="text-[#161e12] dark:text-[#F3FDF8]">{formattedDate}</strong>.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/my-account"
            className="w-full sm:w-auto bg-[#161e12] hover:bg-[#2b3325] dark:bg-[#8bd5b9] dark:hover:bg-[#a6f2d4] text-white dark:text-[#091413] rounded-full px-6 h-11 inline-flex items-center justify-center text-sm font-semibold transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#086948] dark:focus-visible:ring-[#8bd5b9] gap-1.5"
          >
            <span>Go to account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          {successCompany.slug && (
            <Link
              href={`/${successCompany.slug}/dashboard`}
              className="w-full sm:w-auto border border-black/10 dark:border-[#285A48] bg-white dark:bg-[#12211E] hover:bg-[#e6f4ed] dark:hover:bg-[#1B332B] text-[#161e12] dark:text-[#E3F5EC] rounded-full px-6 h-11 inline-flex items-center justify-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#086948] dark:focus-visible:ring-[#8bd5b9] gap-1.5"
            >
              <Building2 className="w-4 h-4 text-[#086948] dark:text-[#8bd5b9]" />
              <span>Open workspace</span>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Signed in: Form (Matching the user's design reference)
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 shadow-xl dark:shadow-[0_8px_32px_-4px_rgba(4,9,8,0.7)] max-w-xl w-full mx-auto space-y-5 transition-colors duration-300">
      {/* 1. User Profile Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-[22px] bg-[#e8f3ed] dark:bg-[#1B332B] border border-[#d2e8dc] dark:border-[#285A48]">
        <div className="flex items-center gap-3.5 min-w-0">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-[#086948]/20 dark:ring-[#8bd5b9]/30"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#086948] dark:bg-[#8bd5b9] text-white dark:text-[#091413] font-bold text-lg flex items-center justify-center shrink-0 shadow-2xs">
              {userInitial}
            </div>
          )}
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-bold text-[#161e12] dark:text-[#F3FDF8] truncate">
                {user.name}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-[#12211E] text-[#086948] dark:text-[#8bd5b9] border border-black/5 dark:border-[#285A48] shadow-2xs">
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Verified</span>
              </span>
            </div>
            <div className="text-xs sm:text-[13px] text-[#555e58] dark:text-[#86A99A] font-medium truncate">
              {user.email}
            </div>
          </div>
        </div>

        <Link
          href="/my-account"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-black/8 dark:border-[#285A48] bg-white dark:bg-[#12211E] hover:bg-[#f7faf8] dark:hover:bg-[#1B332B] text-xs sm:text-sm font-semibold text-[#161e12] dark:text-[#E3F5EC] transition-all shrink-0 shadow-2xs"
        >
          <span>Go to account</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#161e12] dark:text-[#E3F5EC]" />
        </Link>
      </div>

      {/* 2. 14-day trial notice banner */}
      <div className="flex items-center gap-2.5 p-3 sm:px-4 rounded-2xl bg-[#0C1511] dark:bg-[#06100f] text-white border border-black/5 dark:border-[#285A48] shadow-xs">
        <ShieldCheck className="w-4 h-4 text-[#8bd5b9] shrink-0" />
        <span className="text-xs sm:text-[13px] text-white/90">
          Starts your <strong className="font-bold text-white">14-day free trial</strong>. One trial per Google account.
        </span>
      </div>

      {submitError && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-[#ffdad6] dark:bg-[#1C1214] border border-[#ba1a1a]/20 dark:border-[#57252A] text-[#93000a] dark:text-[#ffb4ab] text-xs flex items-start gap-2.5 font-home-body"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{submitError}</div>
        </div>
      )}

      {/* 3. The Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Company Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="company-name"
            className="text-[11px] font-bold text-[#4B5750] dark:text-[#86A99A] uppercase tracking-wider block font-home-mono"
          >
            COMPANY NAME <span className="text-[#ba1a1a] dark:text-[#ffb4ab]">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#76786d] dark:text-[#86A99A]">
              <Building2 className="w-4 h-4" />
            </div>
            <input
              id="company-name"
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="e.g. Acme Corporation"
              className={`w-full bg-[#f7faf8] dark:bg-[#091413] border rounded-[14px] pl-10 pr-4 h-12 text-sm text-[#161e12] dark:text-[#F3FDF8] placeholder:text-[#8e9892] dark:placeholder:text-[#86A99A] outline-none transition-all focus:ring-2 focus:ring-[#086948]/15 dark:focus:ring-[#8bd5b9]/20 font-home-body ${
                errors.name
                  ? "border-[#ba1a1a] dark:border-[#ffb4ab] focus:border-[#ba1a1a]"
                  : "border-black/[0.08] dark:border-[#285A48] focus:border-[#086948] dark:focus:border-[#8bd5b9]"
              }`}
            />
          </div>
          {errors.name && (
            <p className="text-xs text-[#ba1a1a] dark:text-[#ffb4ab] font-medium mt-1 font-home-body">
              {errors.name}
            </p>
          )}
        </div>

        {/* Industry & Employees (2-Column Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          {/* Industry */}
          <div className="space-y-1.5">
            <label
              htmlFor="company-industry"
              className="text-[11px] font-bold text-[#4B5750] dark:text-[#86A99A] uppercase tracking-wider block font-home-mono"
            >
              INDUSTRY <span className="text-[#ba1a1a] dark:text-[#ffb4ab]">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#76786d] dark:text-[#86A99A]">
                <Briefcase className="w-4 h-4" />
              </div>
              <select
                id="company-industry"
                name="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-[#f7faf8] dark:bg-[#091413] border border-black/[0.08] dark:border-[#285A48] rounded-[14px] pl-10 pr-10 h-12 text-sm text-[#161e12] dark:text-[#F3FDF8] outline-none transition-all focus:border-[#086948] dark:focus:border-[#8bd5b9] focus:ring-2 focus:ring-[#086948]/15 dark:focus:ring-[#8bd5b9]/20 appearance-none cursor-pointer font-home-body"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind} className="bg-white dark:bg-[#12211E] text-[#161e12] dark:text-[#F3FDF8]">
                    {ind}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#76786d] dark:text-[#86A99A]">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Number of Employees */}
          <div className="space-y-1.5">
            <label
              htmlFor="company-size"
              className="text-[11px] font-bold text-[#4B5750] dark:text-[#86A99A] uppercase tracking-wider block font-home-mono"
            >
              EMPLOYEES <span className="text-[#ba1a1a] dark:text-[#ffb4ab]">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#76786d] dark:text-[#86A99A]">
                <Users className="w-4 h-4" />
              </div>
              <select
                id="company-size"
                name="employeeCount"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
                className="w-full bg-[#f7faf8] dark:bg-[#091413] border border-black/[0.08] dark:border-[#285A48] rounded-[14px] pl-10 pr-10 h-12 text-sm text-[#161e12] dark:text-[#F3FDF8] outline-none transition-all focus:border-[#086948] dark:focus:border-[#8bd5b9] focus:ring-2 focus:ring-[#086948]/15 dark:focus:ring-[#8bd5b9]/20 appearance-none cursor-pointer font-home-body"
              >
                {EMPLOYEE_RANGES.map((range) => (
                  <option key={range} value={range} className="bg-white dark:bg-[#12211E] text-[#161e12] dark:text-[#F3FDF8]">
                    {range} employees
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#76786d] dark:text-[#86A99A]">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Website & Phone (2-Column Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          {/* Website (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="company-website"
                className="text-[11px] font-bold text-[#4B5750] dark:text-[#86A99A] uppercase tracking-wider block font-home-mono"
              >
                WEBSITE
              </label>
              <span className="text-xs text-[#8e9892] dark:text-[#86A99A] font-home-body">Optional</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#76786d] dark:text-[#86A99A]">
                <Globe className="w-4 h-4" />
              </div>
              <input
                id="company-website"
                name="website"
                type="text"
                value={website}
                onChange={(e) => {
                  setWebsite(e.target.value);
                  if (errors.website)
                    setErrors((prev) => ({ ...prev, website: "" }));
                }}
                placeholder="https://acme.com"
                className={`w-full bg-[#f7faf8] dark:bg-[#091413] border rounded-[14px] pl-10 pr-4 h-12 text-sm text-[#161e12] dark:text-[#F3FDF8] placeholder:text-[#8e9892] dark:placeholder:text-[#86A99A] outline-none transition-all focus:ring-2 focus:ring-[#086948]/15 dark:focus:ring-[#8bd5b9]/20 font-home-body ${
                  errors.website
                    ? "border-[#ba1a1a] dark:border-[#ffb4ab] focus:border-[#ba1a1a]"
                    : "border-black/[0.08] dark:border-[#285A48] focus:border-[#086948] dark:focus:border-[#8bd5b9]"
                }`}
              />
            </div>
            {errors.website && (
              <p className="text-xs text-[#ba1a1a] dark:text-[#ffb4ab] font-medium mt-1 font-home-body">
                {errors.website}
              </p>
            )}
          </div>

          {/* Phone (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="company-phone"
                className="text-[11px] font-bold text-[#4B5750] dark:text-[#86A99A] uppercase tracking-wider block font-home-mono"
              >
                PHONE NUMBER
              </label>
              <span className="text-xs text-[#8e9892] dark:text-[#86A99A] font-home-body">Optional</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#76786d] dark:text-[#86A99A]">
                <Phone className="w-4 h-4" />
              </div>
              <input
                id="company-phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-[#f7faf8] dark:bg-[#091413] border border-black/[0.08] dark:border-[#285A48] rounded-[14px] pl-10 pr-4 h-12 text-sm text-[#161e12] dark:text-[#F3FDF8] placeholder:text-[#8e9892] dark:placeholder:text-[#86A99A] outline-none transition-all focus:border-[#086948] dark:focus:border-[#8bd5b9] focus:ring-2 focus:ring-[#086948]/15 dark:focus:ring-[#8bd5b9]/20 font-home-body"
              />
            </div>
          </div>
        </div>

        {/* Country (Optional) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="company-country"
              className="text-[11px] font-bold text-[#4B5750] dark:text-[#86A99A] uppercase tracking-wider block font-home-mono"
            >
              COUNTRY
            </label>
            <span className="text-xs text-[#8e9892] dark:text-[#86A99A] font-home-body">Optional</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#76786d] dark:text-[#86A99A]">
              <MapPin className="w-4 h-4" />
            </div>
            <input
              id="company-country"
              name="country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. United States"
              className="w-full bg-[#f7faf8] dark:bg-[#091413] border border-black/[0.08] dark:border-[#285A48] rounded-[14px] pl-10 pr-4 h-12 text-sm text-[#161e12] dark:text-[#F3FDF8] placeholder:text-[#8e9892] dark:placeholder:text-[#86A99A] outline-none transition-all focus:border-[#086948] dark:focus:border-[#8bd5b9] focus:ring-2 focus:ring-[#086948]/15 dark:focus:ring-[#8bd5b9]/20 font-home-body"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#0C1511] hover:bg-[#1f2c25] dark:bg-[#8bd5b9] dark:hover:bg-[#a6f2d4] active:scale-[0.99] text-white dark:text-[#091413] disabled:opacity-60 rounded-full h-13 px-6 inline-flex items-center justify-center gap-2 text-sm sm:text-base font-semibold shadow-md dark:shadow-[0_0_24px_rgba(139,213,185,0.25)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#086948] dark:focus-visible:ring-[#8bd5b9] cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white dark:text-[#091413]" />
                <span>Creating your company...</span>
              </>
            ) : (
              <>
                <span>Start free 14-day trial</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

