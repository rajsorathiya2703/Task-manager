"use client";

import React, { useState, useEffect } from "react";
import { Save, AlertCircle, CheckCircle2, Mail, ShieldAlert } from "lucide-react";
import { fetchDayOffSettings, updateDayOffSettings } from "../../../lib/api";

export function DayOffSettingsForm() {
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchDayOffSettings()
      .then((data) => {
        if (data) {
          setAdminEmail(data.defaultAdminEmail || "");
          setIsEnabled(data.isEnabled !== false);
        }
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!adminEmail.trim()) {
      setError("Please specify a valid notification email address.");
      return;
    }

    try {
      setLoading(true);
      await updateDayOffSettings({
        defaultAdminEmail: adminEmail.trim().toLowerCase(),
        isEnabled,
      });
      setSuccess("Settings updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden max-w-2xl">
      <div className="px-6 py-4 border-b border-border bg-muted/20">
        <h2 className="text-sm font-bold text-foreground">Day Off General Settings</h2>
        <p className="text-xs text-muted-foreground">
          Configure default notification recipients and global module availability
        </p>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Default Notification Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
            Default Approval Notification Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="email"
              placeholder="e.g. hr@company.com or manager@company.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              required
            />
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            When an employee applies for a day off, an email containing the <strong>&quot;Approve Leave&quot;</strong> one-click action button will be dispatched to this address via Brevo.
          </p>
        </div>

        {/* Global Module Toggle */}
        <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-foreground block">
              Enable Day Off Module
            </span>
            <span className="text-[11px] text-muted-foreground block">
              Toggle the Day Off leave management system on or off application-wide
            </span>
          </div>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-3 border-t border-border">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {loading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
