"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { sendContactQuery, getApiErrorMessage } from "../../lib/contact-api";

interface ContactFormProps {
  defaultSubject?: string;
}

export function ContactForm({ defaultSubject = "" }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot field

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || trimmedName.length < 2) {
      newErrors.name = "Name must be at least 2 characters.";
    } else if (trimmedName.length > 80) {
      newErrors.name = "Name cannot exceed 80 characters.";
    }

    if (!trimmedEmail) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = "Please enter a valid email address.";
    } else if (trimmedEmail.length > 120) {
      newErrors.email = "Email cannot exceed 120 characters.";
    }

    if (!trimmedMessage || trimmedMessage.length < 10) {
      newErrors.message = "Message must be at least 10 characters.";
    } else if (trimmedMessage.length > 2000) {
      newErrors.message = "Message cannot exceed 2000 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await sendContactQuery({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() ? phone.trim() : undefined,
        subject: subject.trim() ? subject.trim() : undefined,
        message: message.trim(),
        website: website.trim() ? website.trim() : undefined,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setApiError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setSubject(defaultSubject);
    setMessage("");
    setWebsite("");
    setErrors({});
    setApiError(null);
    setIsSuccess(false);
  };

  if (isSuccess) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-8 sm:p-12 text-center shadow-lg space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold tracking-tight text-foreground">
            Message Sent Successfully
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            Thank you for reaching out! Our team has received your query and will respond to your email as soon as possible.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 h-11 inline-flex items-center justify-center text-sm font-medium transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-lg">
      {apiError && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{apiError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Honeypot field: Visually hidden for bots */}
        <div className="absolute -left-[9999px] aria-hidden:true" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        {/* Name Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="contact-name"
            className="text-xs font-bold text-muted-foreground uppercase tracking-wider block"
          >
            Name <span className="text-destructive">*</span>
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
            }}
            placeholder="Your full name"
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

        {/* Email Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="contact-email"
            className="text-xs font-bold text-muted-foreground uppercase tracking-wider block"
          >
            Email Address <span className="text-destructive">*</span>
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
            }}
            placeholder="you@company.com"
            className={`w-full bg-muted/30 border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-1 focus:ring-primary/20 ${
              errors.email
                ? "border-destructive focus:border-destructive"
                : "border-border focus:border-primary"
            }`}
          />
          {errors.email && (
            <p className="text-xs text-destructive font-medium mt-1">
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone Field (Optional) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="contact-phone"
              className="text-xs font-bold text-muted-foreground uppercase tracking-wider block"
            >
              Phone Number
            </label>
            <span className="text-xs text-muted-foreground">Optional</span>
          </div>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* Subject Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="contact-subject"
            className="text-xs font-bold text-muted-foreground uppercase tracking-wider block"
          >
            Subject
          </label>
          <input
            id="contact-subject"
            name="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What would you like to discuss?"
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* Message Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="contact-message"
              className="text-xs font-bold text-muted-foreground uppercase tracking-wider block"
            >
              Message <span className="text-destructive">*</span>
            </label>
            <span
              className={`text-xs ${
                message.length > 2000
                  ? "text-destructive font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              {message.length}/2000
            </span>
          </div>
          <textarea
            id="contact-message"
            name="message"
            rows={5}
            required
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (errors.message) setErrors((prev) => ({ ...prev, message: "" }));
            }}
            placeholder="Tell us about your team, projects, or questions..."
            className={`w-full bg-muted/30 border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all resize-y min-h-[120px] focus:ring-1 focus:ring-primary/20 ${
              errors.message
                ? "border-destructive focus:border-destructive"
                : "border-border focus:border-primary"
            }`}
          />
          {errors.message && (
            <p className="text-xs text-destructive font-medium mt-1">
              {errors.message}
            </p>
          )}
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
                <span>Sending message...</span>
              </>
            ) : (
              <span>Send Message</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
