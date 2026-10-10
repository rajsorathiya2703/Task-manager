"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useGoogleLogin } from "@react-oauth/google";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Building2 } from "lucide-react";
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

const GoogleIcon = () => (
  <svg
    className="w-5 h-5 mr-2 shrink-0"
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
      }
      setSuccessCompany(created);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setSubmitError(
        Array.isArray(msg)
          ? msg.join(", ")
          : msg || "Failed to register company. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initial loading state
  if (checkingSession) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-12 text-center shadow-lg flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground font-medium">
          Checking your session...
        </p>
      </div>
    );
  }

  // Not signed in state
  if (!user || user.authType !== "google") {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-8 sm:p-10 text-center shadow-lg space-y-6 max-w-md mx-auto">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Sign in with Google to start your 14-day trial
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Company registration requires a verified Google account to establish workspace ownership.
          </p>
        </div>

        {authError && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5 text-left"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{authError}</div>
          </div>
        )}

        <button
          type="button"
          disabled={isLoggingInGoogle}
          onClick={() => loginGoogle()}
          className="w-full bg-card hover:bg-muted/80 text-foreground border border-border rounded-xl h-12 inline-flex items-center justify-center font-medium shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isLoggingInGoogle ? (
            <Loader2 className="w-5 h-5 animate-spin text-foreground" />
          ) : (
            <>
              <GoogleIcon />
              <span>Sign in with Google</span>
            </>
          )}
        </button>
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
      <div className="bg-card border border-border/80 rounded-2xl p-8 sm:p-12 text-center shadow-lg space-y-6 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold tracking-tight text-foreground">
            Your company {successCompany.name} is ready
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            Your free trial ends on{" "}
            <strong className="text-foreground">{formattedDate}</strong>.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/my-account"
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-7 h-11 inline-flex items-center justify-center text-sm font-semibold transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 gap-1.5"
          >
            <span>Go to account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          {successCompany.slug && (
            <Link
              href={`/${successCompany.slug}/dashboard`}
              className="w-full sm:w-auto border border-border bg-card hover:bg-muted text-foreground rounded-full px-7 h-11 inline-flex items-center justify-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring gap-1.5"
            >
              <Building2 className="w-4 h-4 text-primary" />
              <span>Open workspace</span>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Signed in: Form
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-lg max-w-xl mx-auto space-y-6">
      {/* User Chip with Go to Account Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60">
        <div className="flex items-center gap-3 min-w-0">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm shrink-0">
              {userInitial}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">
              {user.name}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          </div>
        </div>

        <Link
          href="/my-account"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shrink-0 shadow-2xs"
        >
          <span>Go to account</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
        </Link>
      </div>

      {submitError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{submitError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Company Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="company-name"
            className="text-xs font-bold text-muted-foreground uppercase tracking-wider block"
          >
            Company Name <span className="text-destructive">*</span>
          </label>
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
            className={`w-full bg-muted/30 border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-1 focus:ring-primary/20 ${
              errors.name
                ? "border-destructive focus:border-destructive"
                : "border-border focus:border-primary"
            }`}
          />
          {errors.name && (
            <p className="text-xs text-destructive font-medium mt-1">
              {errors.name}
            </p>
          )}
        </div>

        {/* Industry */}
        <div className="space-y-1.5">
          <label
            htmlFor="company-industry"
            className="text-xs font-bold text-muted-foreground uppercase tracking-wider block"
          >
            Industry <span className="text-destructive">*</span>
          </label>
          <select
            id="company-industry"
            name="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
          >
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        {/* Number of Employees */}
        <div className="space-y-1.5">
          <label
            htmlFor="company-size"
            className="text-xs font-bold text-muted-foreground uppercase tracking-wider block"
          >
            Number of Employees <span className="text-destructive">*</span>
          </label>
          <select
            id="company-size"
            name="employeeCount"
            value={employeeCount}
            onChange={(e) => setEmployeeCount(e.target.value)}
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
          >
            {EMPLOYEE_RANGES.map((range) => (
              <option key={range} value={range}>
                {range} employees
              </option>
            ))}
          </select>
        </div>

        {/* Website (Optional) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="company-website"
              className="text-xs font-bold text-muted-foreground uppercase tracking-wider block"
            >
              Website
            </label>
            <span className="text-xs text-muted-foreground">Optional</span>
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
            className={`w-full bg-muted/30 border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-1 focus:ring-primary/20 ${
              errors.website
                ? "border-destructive focus:border-destructive"
                : "border-border focus:border-primary"
            }`}
          />
          {errors.website && (
            <p className="text-xs text-destructive font-medium mt-1">
              {errors.website}
            </p>
          )}
        </div>

        {/* Phone (Optional) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="company-phone"
              className="text-xs font-bold text-muted-foreground uppercase tracking-wider block"
            >
              Phone Number
            </label>
            <span className="text-xs text-muted-foreground">Optional</span>
          </div>
          <input
            id="company-phone"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* Country (Optional) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="company-country"
              className="text-xs font-bold text-muted-foreground uppercase tracking-wider block"
            >
              Country
            </label>
            <span className="text-xs text-muted-foreground">Optional</span>
          </div>
          <input
            id="company-country"
            name="country"
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. United States"
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 rounded-full h-11 inline-flex items-center justify-center gap-2 text-sm font-semibold transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating your company...</span>
              </>
            ) : (
              <span>Start Free 14-Day Trial</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
