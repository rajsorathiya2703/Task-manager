"use client";

import React, { useState } from "react";
import { 
  Building2, 
  KeyRound, 
  ShieldAlert, 
  Check, 
  Copy, 
  Loader2, 
  AlertCircle, 
  Save, 
  RefreshCw, 
  User, 
  Mail, 
  Globe, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  Briefcase, 
  Users, 
  Lock,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { updateCompany, regenerateCompanyCode } from "@/src/lib/api";

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

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTHS = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
];

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const COMMON_CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "INR", symbol: "₹" },
  { code: "CAD", symbol: "$" },
  { code: "AUD", symbol: "$" },
  { code: "JPY", symbol: "¥" },
  { code: "SGD", symbol: "$" },
];

export interface CompanySettingsFormProps {
  company: any;
  slug: string;
  isOwner: boolean;
  user?: any;
  onUpdateSuccess?: (updated: any) => void;
}

export function CompanySettingsForm({
  company,
  slug,
  isOwner,
  user,
  onUpdateSuccess,
}: CompanySettingsFormProps) {
  // Form State
  const [formData, setFormData] = useState({
    name: company?.name || "",
    industry: company?.industry || "Technology & Software",
    sizeRange: company?.sizeRange || "1-10",
    country: company?.country || "",
    timezone: company?.timezone || "UTC",
    currency: company?.currency || "USD",
    workWeek: company?.workWeek || ["Mon", "Tue", "Wed", "Thu", "Fri"],
    fiscalYearStart: company?.fiscalYearStart || 1,
    contactEmail: company?.contactEmail || "",
    phone: company?.phone || "",
    address: company?.address || "",
    website: company?.website || "",
    logoUrl: company?.logoUrl || "",
    requireCodeOnEveryLogin: Boolean(company?.settings?.requireCodeOnEveryLogin),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Secret code regeneration state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [newSecretCode, setNewSecretCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const handleFieldChange = (field: string, value: any) => {
    if (!isOwner) return;
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleWorkWeekToggle = (day: string) => {
    if (!isOwner) return;
    setFormData((prev) => {
      const exists = prev.workWeek.includes(day);
      const nextDays = exists
        ? prev.workWeek.filter((d: string) => d !== day)
        : [...prev.workWeek, day];
      return { ...prev, workWeek: nextDays };
    });
    setSaveSuccess(false);
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      const payload: any = {
        name: formData.name.trim(),
        industry: formData.industry,
        sizeRange: formData.sizeRange,
        country: formData.country.trim(),
        timezone: formData.timezone,
        currency: formData.currency,
        workWeek: formData.workWeek,
        fiscalYearStart: Number(formData.fiscalYearStart),
        contactEmail: formData.contactEmail.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        website: formData.website.trim() || undefined,
        logoUrl: formData.logoUrl.trim() || undefined,
        settings: {
          requireCodeOnEveryLogin: formData.requireCodeOnEveryLogin,
        },
      };

      const updated = await updateCompany(slug, payload);
      setSaveSuccess(true);
      if (onUpdateSuccess) {
        onUpdateSuccess(updated);
      }
    } catch (err: any) {
      console.error("Failed to update company:", err);
      const msg = err.response?.data?.message;
      setSaveError(
        typeof msg === "string"
          ? msg
          : Array.isArray(msg)
          ? msg.join(", ")
          : "Failed to update company settings. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmRegenerate = async () => {
    try {
      setIsRegenerating(true);
      setRegenError(null);
      const res = await regenerateCompanyCode(slug);
      setNewSecretCode(res.secretCode);
      setIsConfirmModalOpen(false);
    } catch (err: any) {
      console.error("Failed to regenerate code:", err);
      setRegenError(
        err.response?.data?.message || "Failed to regenerate secret code. Please try again."
      );
      setIsConfirmModalOpen(false);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (!newSecretCode) return;
    navigator.clipboard.writeText(newSecretCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Read-Only Notice for Non-Owners */}
      {!isOwner && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center gap-3 text-xs shadow-xs">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="leading-relaxed">
            You are viewing company settings in <strong>read-only mode</strong>. Only the workspace owner can modify organization details, manage join policies, or regenerate secret codes.
          </p>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: COMPANY PROFILE
          ───────────────────────────────────────────────────────────── */}
      <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Company Profile</h2>
              <p className="text-xs text-muted-foreground">
                Manage organization branding, regional configuration, and business hours.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmitProfile} className="space-y-6">
            {saveSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Company profile updated successfully.</span>
              </div>
            )}

            {saveError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Core Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  disabled={!isOwner}
                  required
                  placeholder="Acme Corp"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Company Workspace Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  disabled
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-muted/50 text-muted-foreground font-mono cursor-not-allowed"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  The URL slug cannot be changed after registration.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Industry
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => handleFieldChange("industry", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Company Size
                </label>
                <select
                  value={formData.sizeRange}
                  onChange={(e) => handleFieldChange("sizeRange", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {SIZE_RANGES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleFieldChange("country", e.target.value)}
                  disabled={!isOwner}
                  placeholder="United States"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => handleFieldChange("timezone", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleFieldChange("currency", e.target.value)}
                  disabled={!isOwner}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {COMMON_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Fiscal Year Start Month
                </label>
                <select
                  value={formData.fiscalYearStart}
                  onChange={(e) => handleFieldChange("fiscalYearStart", Number(e.target.value))}
                  disabled={!isOwner}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Work Week Checkboxes */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-foreground mb-2">
                Work Week Days
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isChecked = formData.workWeek.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!isOwner}
                      onClick={() => handleWorkWeekToggle(day)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                        isChecked
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-input hover:bg-muted"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contact Details */}
            <div className="border-t border-border pt-5">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">
                Contact & Location
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleFieldChange("contactEmail", e.target.value)}
                    disabled={!isOwner}
                    placeholder="contact@company.com"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                    disabled={!isOwner}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleFieldChange("website", e.target.value)}
                    disabled={!isOwner}
                    placeholder="https://example.com"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Logo Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => handleFieldChange("logoUrl", e.target.value)}
                    disabled={!isOwner}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Physical Address
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => handleFieldChange("address", e.target.value)}
                    disabled={!isOwner}
                    placeholder="123 Tech Boulevard, Suite 400"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Save Profile Button */}
            {isOwner && (
              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="h-10 px-6 rounded-xl text-xs gap-2 shadow-xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Company Profile</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: JOIN POLICY
          ───────────────────────────────────────────────────────────── */}
      <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Join & Access Policy</h2>
              <p className="text-xs text-muted-foreground">
                Control authentication safeguards and membership entry requirements.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">
                Require Secret Code on Every Login
              </h4>
              <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
                When enabled, members will be prompted to re-enter the company secret code every time they log in, adding an extra security barrier.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={formData.requireCodeOnEveryLogin}
                disabled={!isOwner}
                onChange={(e) => handleFieldChange("requireCodeOnEveryLogin", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary disabled:opacity-50"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: SECRET CODE (OWNER ONLY)
          ───────────────────────────────────────────────────────────── */}
      {isOwner && (
        <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Workspace Secret Code</h2>
                <p className="text-xs text-muted-foreground">
                  Manage the private invite code used by members to join this company.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wide">
              Owner Only
            </span>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Use this secret code to onboard new employees into your company workspace. Anyone with this code can join and access workspace resources according to their assigned roles.
            </p>

            {regenError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{regenError}</span>
              </div>
            )}

            {/* Display newly generated code if available */}
            {newSecretCode ? (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>New secret code successfully generated!</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-background border border-border">
                  <span className="font-mono text-base font-bold text-foreground tracking-widest">
                    {newSecretCode}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCopyCode}
                    className="h-9 px-3 text-xs gap-1.5 rounded-lg"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  <strong>Important:</strong> This secret code is shown only once. Please copy and store it securely.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-foreground">
                    Rotate Secret Join Code
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    If you suspect the code has been compromised, generate a new one immediately.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="h-9 px-4 rounded-xl text-xs gap-2 shrink-0 border-border text-foreground hover:bg-muted"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate Code</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: USER PERSONAL PROFILE (RETAINED CONTEXT)
          ───────────────────────────────────────────────────────────── */}
      {user && (
        <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Personal Account</h2>
                <p className="text-xs text-muted-foreground">
                  Your individual credentials in this company workspace.
                </p>
              </div>
            </div>
          </div>

          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={user.name || "User"}
                  disabled
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-muted/40 text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-muted/40 text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CONFIRM REGENERATE MODAL
          ───────────────────────────────────────────────────────────── */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <Card className="w-full max-w-md rounded-2xl shadow-xl border-border bg-card overflow-hidden">
            <CardContent className="p-6 sm:p-7 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-foreground">
                  Regenerate Secret Code?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Old code stops working immediately. Existing members are not affected.
                </p>
              </div>

              <div className="pt-3 flex gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  disabled={isRegenerating}
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="h-10 rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  disabled={isRegenerating}
                  onClick={handleConfirmRegenerate}
                  className="h-10 rounded-xl text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5"
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Regenerating...</span>
                    </>
                  ) : (
                    <span>Confirm & Regenerate</span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
