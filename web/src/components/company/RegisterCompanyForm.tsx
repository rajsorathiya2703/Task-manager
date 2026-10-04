"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { 
  Building2, 
  Settings2, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Copy, 
  Check, 
  AlertTriangle, 
  Loader2, 
  Globe, 
  Clock, 
  DollarSign, 
  Calendar, 
  Mail, 
  Phone, 
  MapPin, 
  CheckSquare, 
  Square,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { 
  fetchMe, 
  registerCompany, 
  isSlugAvailable, 
  api, 
  authEndpoints 
} from "@/src/lib/api";

const INDUSTRIES = [
  "Technology & Software",
  "Design & Creative",
  "Marketing & Advertising",
  "Finance & Banking",
  "Healthcare & Life Sciences",
  "Education & E-learning",
  "E-commerce & Retail",
  "Consulting & Professional Services",
  "Manufacturing & Engineering",
  "Media & Entertainment",
  "Real Estate & Construction",
  "Other"
];

const SIZE_RANGES = [
  { label: "1 - 10 employees", value: "1-10" },
  { label: "11 - 50 employees", value: "11-50" },
  { label: "51 - 200 employees", value: "51-200" },
  { label: "201 - 500 employees", value: "201-500" },
  { label: "501 - 1,000 employees", value: "501-1000" },
  { label: "1,000+ employees", value: "1000+" },
];

const COMMON_COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "India",
  "Japan",
  "Singapore",
  "Netherlands",
  "Ireland",
  "Spain",
  "Brazil",
  "United Arab Emirates",
  "Other"
];

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "CAD", symbol: "$" },
  { code: "AUD", symbol: "$" },
  { code: "INR", symbol: "₹" },
  { code: "JPY", symbol: "¥" },
  { code: "SGD", symbol: "$" },
  { code: "CHF", symbol: "Fr" },
];

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const MONTHS = [
  { value: 1, name: "January" },
  { value: 2, name: "February" },
  { value: 3, name: "March" },
  { value: 4, name: "April" },
  { value: 5, name: "May" },
  { value: 6, name: "June" },
  { value: 7, name: "July" },
  { value: 8, name: "August" },
  { value: 9, name: "September" },
  { value: 10, name: "October" },
  { value: 11, name: "November" },
  { value: 12, name: "December" },
];

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-3 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidSlugFormat(slug: string): boolean {
  if (slug.length < 3 || slug.length > 40) return false;
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

export function RegisterCompanyForm() {
  const router = useRouter();

  // Auth state
  const [user, setUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Wizard state: 1 = Company, 2 = Settings, 3 = Done
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Company details
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [otherIndustry, setOtherIndustry] = useState("");
  const [sizeRange, setSizeRange] = useState(SIZE_RANGES[0].value);
  const [country, setCountry] = useState(COMMON_COUNTRIES[0]);

  // Slug check states
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugStatusMessage, setSlugStatusMessage] = useState<string | null>(null);

  // Step 2: Settings & Contact
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  });
  const [currency, setCurrency] = useState("USD");
  const [workWeek, setWorkWeek] = useState<string[]>([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
  ]);
  const [fiscalYearStart, setFiscalYearStart] = useState<number>(1);
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");

  // Step 3 / Submission results
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdCompany, setCreatedCompany] = useState<any>(null);
  const [oneTimeSecretCode, setOneTimeSecretCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch initial auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoadingAuth(true);
        const me = await fetchMe();
        if (me && me.authType !== "guest") {
          setUser(me);
          if (me.email) {
            setContactEmail(me.email);
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    checkAuth();
  }, []);

  // Google sign in hook
  const loginGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoggingInGoogle(true);
        setAuthError(null);
        await api.post(authEndpoints.googleLogin, { token: tokenResponse.access_token });
        const me = await fetchMe();
        setUser(me);
        if (me?.email) {
          setContactEmail(me.email);
        }
      } catch (err: any) {
        setAuthError(err.response?.data?.message || "Failed to sign in with Google.");
      } finally {
        setIsLoggingInGoogle(false);
      }
    },
    onError: () => setAuthError("Google sign-in was cancelled or failed."),
  });

  // Name change: auto-slugify if user hasn't explicitly edited the slug
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugManuallyEdited) {
      const generated = slugify(val);
      setSlug(generated);
    }
  };

  // Debounced live check for slug availability
  useEffect(() => {
    if (!slug) {
      setSlugAvailable(null);
      setSlugStatusMessage(null);
      return;
    }

    if (!isValidSlugFormat(slug)) {
      setSlugAvailable(false);
      if (slug.length < 3) {
        setSlugStatusMessage("Slug must be at least 3 characters.");
      } else if (slug.length > 40) {
        setSlugStatusMessage("Slug must be 40 characters or fewer.");
      } else {
        setSlugStatusMessage("Lowercase letters, numbers, and single hyphens only.");
      }
      return;
    }

    let isMounted = true;
    setIsCheckingSlug(true);
    setSlugStatusMessage(null);

    const timer = setTimeout(async () => {
      try {
        const res = await isSlugAvailable(slug);
        if (!isMounted) return;
        if (res && res.available) {
          setSlugAvailable(true);
          setSlugStatusMessage("Slug is available!");
        } else {
          setSlugAvailable(false);
          setSlugStatusMessage("This slug is already taken or reserved.");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setSlugAvailable(false);
        setSlugStatusMessage(err.response?.data?.message || "Error validating slug availability.");
      } finally {
        if (isMounted) setIsCheckingSlug(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [slug]);

  // Toggle work week days
  const toggleWorkDay = (day: string) => {
    setWorkWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Submit Step 1 -> Step 2
  const handleProceedToSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!slug.trim() || slugAvailable !== true) return;
    setCurrentStep(2);
  };

  // Final Registration Call
  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionError(null);

    const cleanEmail = contactEmail.trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setSubmissionError("Please provide a valid email address for contact email or leave it empty.");
      setIsSubmitting(false);
      return;
    }

    const resolvedIndustry = industry === "Other" ? (otherIndustry.trim() || "Other") : industry;
    let formattedWebsite = website.trim();
    if (formattedWebsite && !formattedWebsite.startsWith("http://") && !formattedWebsite.startsWith("https://")) {
      formattedWebsite = `https://${formattedWebsite}`;
    }

    const payload: any = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
    };

    if (resolvedIndustry?.trim()) payload.industry = resolvedIndustry.trim();
    if (sizeRange?.trim()) payload.sizeRange = sizeRange.trim();
    if (country?.trim()) payload.country = country.trim();
    if (timezone?.trim()) payload.timezone = timezone.trim();
    if (currency?.trim()) payload.currency = currency.trim();
    if (workWeek && workWeek.length > 0) payload.workWeek = workWeek;
    if (fiscalYearStart) payload.fiscalYearStart = Number(fiscalYearStart) || 1;
    if (cleanEmail) payload.contactEmail = cleanEmail;
    if (phone.trim()) payload.phone = phone.trim();
    if (address.trim()) payload.address = address.trim();
    if (formattedWebsite) payload.website = formattedWebsite;

    try {
      const result = await registerCompany(payload);
      setCreatedCompany(result.company || { name: payload.name, slug: payload.slug });
      setOneTimeSecretCode(result.secretCode);

      // Save to localStorage as lastCompany
      if (result.company?.slug || payload.slug) {
        try {
          localStorage.setItem("lastCompany", result.company?.slug || payload.slug);
        } catch {
          // Ignore storage errors in incognito/restricted mode
        }
      }

      setCurrentStep(3);
    } catch (err: any) {
      console.error("Failed to register company:", err);
      const statusCode = err.response?.status;
      const rawMessage = err.response?.data?.message;
      const formattedMessage = Array.isArray(rawMessage)
        ? rawMessage.join(". ")
        : rawMessage;

      if (statusCode === 409) {
        // Slug taken or reserved
        setSubmissionError(formattedMessage || "This company slug is already in use. Please select a different slug.");
        // Go back to step 1 so they can choose a new slug
        setCurrentStep(1);
        setSlugAvailable(false);
        setSlugStatusMessage(formattedMessage || "This slug is already taken.");
      } else {
        setSubmissionError(formattedMessage || "Failed to register company. Please verify your entries and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!oneTimeSecretCode) return;
    try {
      await navigator.clipboard.writeText(oneTimeSecretCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    } catch {
      // Fallback
      setCopiedCode(true);
    }
  };

  const handleGoToWorkspace = () => {
    const destinationSlug = createdCompany?.slug || slug;
    if (destinationSlug) {
      router.push(`/${destinationSlug}/dashboard`);
    } else {
      router.push("/");
    }
  };

  // ─── Loading Authentication State ──────────────────────────────────────────
  if (isLoadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Checking authentication status...</p>
      </div>
    );
  }

  // ─── Not Signed In / Guest User Gate ────────────────────────────────────────
  if (!user || user.authType === "guest") {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-lg border-border">
          <CardContent className="flex flex-col items-center text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 shadow-xs">
              <Building2 className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold tracking-tight text-foreground mb-1.5">
              Register Your Company
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Sign in with your Google account to create and manage your company workspace.
            </p>

            {authError && (
              <div className="w-full p-3.5 mb-5 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl text-left">
                {authError}
              </div>
            )}

            <Button
              variant="google"
              fullWidth
              disabled={isLoggingInGoogle}
              onClick={() => loginGoogle()}
              className="gap-2 shadow-xs py-3 h-12 rounded-xl"
            >
              {isLoggingInGoogle ? (
                <Loader2 className="w-4 h-4 animate-spin text-foreground" />
              ) : (
                <GoogleIcon />
              )}
              <span className="font-semibold text-sm">Sign in with Google</span>
            </Button>

            <p className="text-xs text-muted-foreground mt-4">
              Registration requires an authenticated Google account to assign workspace ownership.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* ── Progress Stepper Header ── */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              currentStep === 1
                ? "bg-primary text-primary-foreground shadow-sm"
                : currentStep > 1
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {currentStep > 1 ? <Check className="w-4 h-4" /> : "1"}
          </div>
          <span className={`text-xs font-semibold ${currentStep === 1 ? "text-foreground" : "text-muted-foreground"}`}>
            Company Profile
          </span>
        </div>

        <div className="h-0.5 w-12 sm:w-20 bg-border mx-2" />

        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              currentStep === 2
                ? "bg-primary text-primary-foreground shadow-sm"
                : currentStep > 2
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {currentStep > 2 ? <Check className="w-4 h-4" /> : "2"}
          </div>
          <span className={`text-xs font-semibold ${currentStep === 2 ? "text-foreground" : "text-muted-foreground"}`}>
            Settings & Contact
          </span>
        </div>

        <div className="h-0.5 w-12 sm:w-20 bg-border mx-2" />

        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              currentStep === 3
                ? "bg-emerald-500 text-white shadow-sm"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className={`text-xs font-semibold ${currentStep === 3 ? "text-foreground" : "text-muted-foreground"}`}>
            Workspace Ready
          </span>
        </div>
      </div>

      {submissionError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-xs text-red-600 dark:text-red-400 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Registration Notice</p>
            <p className="mt-0.5">{submissionError}</p>
          </div>
        </div>
      )}

      {/* ── STEP 1: Company Profile ── */}
      {currentStep === 1 && (
        <Card className="border-border shadow-md">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Company Profile
              </h2>
              <p className="text-xs text-muted-foreground">
                Set up your company&apos;s identity and customized workspace URL.
              </p>
            </div>

            <form onSubmit={handleProceedToSettings} className="space-y-5">
              {/* Company Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Company Slug */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Workspace URL Slug <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">3-40 characters, lowercase</span>
                </div>

                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs text-muted-foreground font-mono select-none">
                    /
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => {
                      setIsSlugManuallyEdited(true);
                      setSlug(slugify(e.target.value));
                    }}
                    placeholder="acme-corp"
                    className={`w-full bg-muted/30 border rounded-xl pl-7 pr-10 py-2.5 text-sm font-mono text-foreground outline-none transition-all ${
                      slugAvailable === true
                        ? "border-emerald-500/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                        : slugAvailable === false
                        ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                        : "border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                    }`}
                  />
                  <div className="absolute right-3.5 flex items-center">
                    {isCheckingSlug ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : slugAvailable === true ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : slugAvailable === false ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : null}
                  </div>
                </div>

                {slugStatusMessage && (
                  <p
                    className={`text-xs mt-1 flex items-center gap-1 ${
                      slugAvailable === true
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : "text-red-500 font-medium"
                    }`}
                  >
                    {slugStatusMessage}
                  </p>
                )}
              </div>

              {/* Industry & Size Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Industry
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind} className="bg-card text-foreground">
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Company Size
                  </label>
                  <select
                    value={sizeRange}
                    onChange={(e) => setSizeRange(e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  >
                    {SIZE_RANGES.map((size) => (
                      <option key={size.value} value={size.value} className="bg-card text-foreground">
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom industry input if 'Other' selected */}
              {industry === "Other" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Specify Industry
                  </label>
                  <input
                    type="text"
                    value={otherIndustry}
                    onChange={(e) => setOtherIndustry(e.target.value)}
                    placeholder="Enter industry name"
                    className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
              )}

              {/* Country */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-muted/30 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                >
                  {COMMON_COUNTRIES.map((c) => (
                    <option key={c} value={c} className="bg-card text-foreground">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Continue Button */}
              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={!name.trim() || slugAvailable !== true || isCheckingSlug}
                  className="gap-2 px-6 rounded-xl shadow-xs"
                >
                  <span>Continue to Settings</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: Workspace Settings & Contact ── */}
      {currentStep === 2 && (
        <Card className="border-border shadow-md">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Workspace Settings & Contact
              </h2>
              <p className="text-xs text-muted-foreground">
                Configure your organization&apos;s operational schedule, currency, and business contact.
              </p>
            </div>

            <form onSubmit={handleRegisterCompany} className="space-y-6">
              {/* Regional: Timezone & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Timezone
                  </label>
                  <input
                    type="text"
                    required
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="e.g. America/New_York"
                    className="w-full bg-muted/30 border border-border rounded-xl px-3.5 py-2.5 text-sm font-mono text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                  <p className="text-[11px] text-muted-foreground">Auto-detected from your browser</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    Base Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  >
                    {CURRENCIES.map((cur) => (
                      <option key={cur.code} value={cur.code} className="bg-card text-foreground">
                        {cur.code} ({cur.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Work Week Checkboxes */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Standard Working Days
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {DAYS_OF_WEEK.map((day) => {
                    const isChecked = workWeek.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleWorkDay(day)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                          isChecked
                            ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                            : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                        )}
                        <span>{day.slice(0, 3)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fiscal Year Start */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Fiscal Year Start Month
                </label>
                <select
                  value={fiscalYearStart}
                  onChange={(e) => setFiscalYearStart(Number(e.target.value))}
                  className="w-full bg-muted/30 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value} className="bg-card text-foreground">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Information */}
              <div className="pt-2 border-t border-border/50 space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Company Contact & Address
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="admin@company.com"
                      className="w-full bg-muted/30 border border-border rounded-xl px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-muted/30 border border-border rounded-xl px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    Office Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Business Way, Suite 400"
                    className="w-full bg-muted/30 border border-border rounded-xl px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    Website URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-muted/30 border border-border rounded-xl px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="pt-4 flex items-center justify-between border-t border-border/50">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCurrentStep(1)}
                  disabled={isSubmitting}
                  className="gap-2 px-5 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="gap-2 px-6 rounded-xl shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Workspace...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Create Company Workspace</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: Done & One-Time Secret Code ── */}
      {currentStep === 3 && (
        <Card className="border-border shadow-xl">
          <CardContent className="p-6 sm:p-8 space-y-6 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-border/50 pb-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Workspace Created Successfully!
                </h2>
                <p className="text-xs text-muted-foreground">
                  Your organization <span className="font-semibold text-foreground">{createdCompany?.name}</span> is live at{" "}
                  <span className="font-mono text-primary">/{createdCompany?.slug}</span>.
                </p>
              </div>
            </div>

            {/* Secret Code Big Box */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Company Secret Invite Code
                </span>
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Shown Once
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="font-mono text-2xl sm:text-3xl font-bold text-primary tracking-widest select-all break-all text-center sm:text-left">
                  {oneTimeSecretCode || "••••••••"}
                </div>

                <Button
                  variant="secondary"
                  onClick={handleCopyCode}
                  className="gap-2 px-4 h-10 rounded-xl shrink-0 bg-background border border-border shadow-xs hover:bg-muted"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-500 font-semibold text-xs">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-xs font-medium">Copy Code</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Warning Alert */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-3 text-left leading-relaxed">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Important: Save this invite code now</p>
                  <p className="text-muted-foreground">
                    You will not be able to see this code again — you can regenerate it in Company Settings. 
                    Share this code with team members you wish to invite to this workspace.
                  </p>
                </div>
              </div>
            </div>

            {/* Go to Workspace Action */}
            <div className="pt-4 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                You are registered as the workspace administrator.
              </p>
              <Button
                onClick={handleGoToWorkspace}
                className="w-full sm:w-auto gap-2 px-6 h-11 rounded-xl shadow-md text-sm font-semibold"
              >
                <span>Go to your workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
