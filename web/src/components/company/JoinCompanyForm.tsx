"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building2, 
  KeyRound, 
  Loader2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck,
  UserCheck
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { joinCompany } from "@/src/lib/api";

export interface JoinCompanyFormProps {
  company: {
    name: string;
    slug: string;
    logoUrl?: string;
  };
  currentUser?: {
    email?: string;
    name?: string;
    avatar?: string;
  };
}

export function JoinCompanyForm({ company, currentUser }: JoinCompanyFormProps) {
  const router = useRouter();
  const [secretCode, setSecretCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-uppercase; preserves spaces so pasted codes with spaces are accepted seamlessly
    const val = e.target.value.toUpperCase();
    setSecretCode(val);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = secretCode.trim();

    if (!cleanCode) {
      setError("Please enter the company secret code");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await joinCompany(company.slug, cleanCode);

      try {
        localStorage.setItem("lastCompany", company.slug);
      } catch {
        // localStorage not available
      }

      router.push(`/${company.slug}/dashboard`);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        setError("Invalid company code");
      } else if (status === 429) {
        setError("Too many attempts, try again in a minute");
      } else if (status === 404) {
        // Never reveal whether the company exists beyond the public info already shown
        setError("Invalid company code");
      } else {
        const msg = err?.response?.data?.message;
        if (typeof msg === "string" && msg.toLowerCase().includes("too many")) {
          setError("Too many attempts, try again in a minute");
        } else {
          setError("Invalid company code");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md px-4 sm:px-0 mx-auto">
      {/* Brand Header */}
      <div className="flex flex-col items-center justify-center mb-6">
        {company.logoUrl ? (
          <img
            src={company.logoUrl}
            alt={company.name}
            className="w-16 h-16 rounded-2xl object-cover mb-4 border border-border shadow-sm"
          />
        ) : (
          <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-4 text-primary shadow-xs">
            <Building2 className="w-8 h-8" />
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-foreground text-center">
          {company.name}
        </h1>
        <p className="text-xs font-mono text-muted-foreground mt-1">/{company.slug}</p>
      </div>

      <Card className="shadow-md border-border mb-6">
        <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Workspace Join Request</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Enter Secret Code
            </h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Enter the secret code shared by your company administrator to join this workspace.
            </p>
          </div>

          {/* Current User Pill */}
          {currentUser?.email && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate text-muted-foreground">
                  Joining as <strong className="text-foreground font-medium">{currentUser.email}</strong>
                </span>
              </div>
              <Link
                href={`/${company.slug}/login`}
                className="text-xs text-primary hover:underline font-medium shrink-0 ml-2"
              >
                Switch
              </Link>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-left animate-in fade-in-50">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="secretCode"
                className="block text-xs font-medium text-foreground text-left"
              >
                Company secret code
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="secretCode"
                  name="secretCode"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck="false"
                  placeholder="XXXX-XXXX-XXXX"
                  value={secretCode}
                  onChange={handleCodeChange}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 text-sm uppercase font-mono tracking-wider rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground/60 placeholder:normal-case placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-muted-foreground text-left">
                Case-insensitive code provided during company setup or by your company owner.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting || !secretCode.trim()}
              className="h-11 rounded-xl shadow-xs gap-2 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining Workspace...</span>
                </>
              ) : (
                <>
                  <span>Join Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground space-y-2">
        <div>
          Need an account or not a member?{" "}
          <Link
            href={`/${company.slug}/login`}
            className="text-primary hover:underline font-medium"
          >
            Go to login
          </Link>
        </div>
        <div>
          Want to register a new organization?{" "}
          <Link
            href="/register-company"
            className="text-primary hover:underline font-medium"
          >
            Register company
          </Link>
        </div>
      </div>
    </div>
  );
}
