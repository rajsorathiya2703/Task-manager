"use client";

import { useState } from "react";
import {
  Mail,
  Phone,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { sendContactQuery, getApiErrorMessage } from "../../lib/contact-api";

function LinkedInIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="4" />
      <line x1="8" x2="8" y1="11" y2="17" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
      <path d="M12 17v-3.5a2 2 0 0 1 4 0V17" />
    </svg>
  );
}

function InstagramIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

interface ContactSectionProps {
  defaultSubject?: string;
}

export function ContactSection({ defaultSubject = "" }: ContactSectionProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot field for spam prevention

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

    if (!trimmedMessage || trimmedMessage.length < 5) {
      newErrors.message = "Message must be at least 5 characters.";
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
    } catch (err: unknown) {
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

  return (
    <section className="relative isolate overflow-hidden bg-[var(--home-bg)] text-[var(--home-text-body)] py-12 sm:py-20 transition-colors duration-300">
      
      {/* Soft Ambient Organic Curved Shape on Bottom Left */}
      <div
        className="absolute -left-28 -bottom-28 w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] rounded-full bg-[#dbe8df]/70 dark:bg-[#142d24]/50 pointer-events-none -z-10 transition-colors duration-300"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Eyebrow + Headline + Description + 4 Contact Cards (2x2)     */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 flex flex-col justify-center text-left">
            
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-[#285A48] bg-white/80 dark:bg-[#12211E] px-3.5 py-1.5 text-xs font-semibold text-[#161e12] dark:text-[#E3F5EC] mb-6 shadow-2xs w-fit">
              <span className="w-2 h-2 rounded-full bg-[#086948] dark:bg-[#8bd5b9] shrink-0" />
              <span>Contact us</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight leading-[1.06]">
              <span className="text-[#161e12] dark:text-[#F3FDF8]">
                Let&apos;s talk about
              </span>
              <br />
              <span className="text-[#086948] dark:text-[#8bd5b9]">
                your project
              </span>
            </h1>

            {/* Description Paragraph */}
            <p className="mt-5 text-sm sm:text-base text-[#4B5750] dark:text-[#9bb7ab] leading-relaxed max-w-md">
              Tell us what you need, whether it is a CRM, a website, an application or AI for your business. Send a message and we will get back to you.
            </p>

            {/* 4 Contact Cards (2x2 Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mt-8 sm:mt-10 max-w-lg">
              
              {/* Card 1: Email us (Highlight Forest Green Card) */}
              <a
                href="mailto:raj2732005@gmail.com"
                className="rounded-[24px] bg-[#086948] text-white p-5 text-left shadow-md flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group min-h-[120px]"
              >
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white mb-6 shrink-0 group-hover:bg-white/25 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-white/80 font-medium block">
                    Email us
                  </span>
                  <span className="text-sm font-bold text-white tracking-tight break-all mt-0.5 block">
                    raj2732005@gmail.com
                  </span>
                </div>
              </a>

              {/* Card 2: Call us (Dark Obsidian Card) */}
              <a
                href="tel:+917284098574"
                className="rounded-[24px] bg-[#0c1612] text-white p-5 text-left shadow-md flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-white/5 group min-h-[120px]"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#5eead4] mb-6 shrink-0 group-hover:bg-white/15 transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-medium block">
                    Call us
                  </span>
                  <span className="text-sm font-bold text-white tracking-tight mt-0.5 block">
                    +91 7284098574
                  </span>
                </div>
              </a>

              {/* Card 3: Connect with us (White Card - LinkedIn) */}
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[24px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-5 text-left shadow-xs flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-md group min-h-[120px]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center mb-6 shrink-0 group-hover:bg-[#d8efe2] dark:group-hover:bg-[#234d3f] transition-colors">
                  <LinkedInIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-[#555e58] dark:text-[#86A99A] font-medium block">
                    Connect with us
                  </span>
                  <span className="text-sm font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight mt-0.5 block">
                    LinkedIn
                  </span>
                </div>
              </a>

              {/* Card 4: Follow us (White Card - Instagram) */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[24px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-5 text-left shadow-xs flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-md group min-h-[120px]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center mb-6 shrink-0 group-hover:bg-[#d8efe2] dark:group-hover:bg-[#234d3f] transition-colors">
                  <InstagramIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-[#555e58] dark:text-[#86A99A] font-medium block">
                    Follow us
                  </span>
                  <span className="text-sm font-bold text-[#161e12] dark:text-[#E3F5EC] tracking-tight mt-0.5 block">
                    Instagram
                  </span>
                </div>
              </a>

            </div>

          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Send us a message (Form Card Container)                     */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7">
            <div className="w-full rounded-[32px] sm:rounded-[36px] bg-white dark:bg-[#12211E] border border-black/8 dark:border-[#285A48] p-7 sm:p-10 shadow-2xl text-left">
              
              {isSuccess ? (
                <div className="py-8 sm:py-12 text-center space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#e6f4ed] dark:bg-[#1b3b30] text-[#086948] dark:text-[#8bd5b9] flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold tracking-tight text-[#161e12] dark:text-[#E3F5EC]">
                      Message Sent Successfully
                    </h3>
                    <p className="text-sm text-[#4B5750] dark:text-[#9bb7ab] max-w-md mx-auto leading-relaxed">
                      Thank you for reaching out! Our team has received your message and will get back to you shortly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-full bg-[#0C1511] hover:bg-[#202c25] dark:bg-[#8bd5b9] dark:hover:bg-[#a6f2d4] text-white dark:text-[#091413] px-7 py-3.5 text-sm font-semibold transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#161e12] dark:text-[#E3F5EC]">
                    Send us a message
                  </h2>
                  <p className="text-xs sm:text-sm text-[#555e58] dark:text-[#86A99A] mt-1.5 mb-7">
                    All fields are required.
                  </p>

                  {apiError && (
                    <div
                      role="alert"
                      className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="flex-1 font-medium">{apiError}</div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
                    {/* Honeypot field for anti-spam */}
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

                    {/* Row 1: Name & Email address */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name Field */}
                      <div>
                        <label
                          htmlFor="contact-name"
                          className="text-xs font-semibold text-[#161e12] dark:text-[#E3F5EC] block mb-2"
                        >
                          Name
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
                          className={`w-full bg-[#f4f7f4] dark:bg-[#0c1612] border rounded-2xl px-4 py-3.5 text-sm text-[#161e12] dark:text-[#E3F5EC] placeholder:text-gray-400 outline-none transition-all focus:ring-2 focus:ring-[#086948] ${
                            errors.name
                              ? "border-destructive focus:ring-destructive"
                              : "border-transparent dark:border-[#1e3b30]"
                          }`}
                        />
                        {errors.name && (
                          <p className="text-xs text-destructive font-medium mt-1.5">
                            {errors.name}
                          </p>
                        )}
                      </div>

                      {/* Email Address Field */}
                      <div>
                        <label
                          htmlFor="contact-email"
                          className="text-xs font-semibold text-[#161e12] dark:text-[#E3F5EC] block mb-2"
                        >
                          Email address
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
                          className={`w-full bg-[#f4f7f4] dark:bg-[#0c1612] border rounded-2xl px-4 py-3.5 text-sm text-[#161e12] dark:text-[#E3F5EC] placeholder:text-gray-400 outline-none transition-all focus:ring-2 focus:ring-[#086948] ${
                            errors.email
                              ? "border-destructive focus:ring-destructive"
                              : "border-transparent dark:border-[#1e3b30]"
                          }`}
                        />
                        {errors.email && (
                          <p className="text-xs text-destructive font-medium mt-1.5">
                            {errors.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Phone number & Subject */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Phone Number Field */}
                      <div>
                        <label
                          htmlFor="contact-phone"
                          className="text-xs font-semibold text-[#161e12] dark:text-[#E3F5EC] block mb-2"
                        >
                          Phone number
                        </label>
                        <input
                          id="contact-phone"
                          name="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 00000 00000"
                          className="w-full bg-[#f4f7f4] dark:bg-[#0c1612] border border-transparent dark:border-[#1e3b30] rounded-2xl px-4 py-3.5 text-sm text-[#161e12] dark:text-[#E3F5EC] placeholder:text-gray-400 outline-none transition-all focus:ring-2 focus:ring-[#086948]"
                        />
                      </div>

                      {/* Subject Field */}
                      <div>
                        <label
                          htmlFor="contact-subject"
                          className="text-xs font-semibold text-[#161e12] dark:text-[#E3F5EC] block mb-2"
                        >
                          Subject
                        </label>
                        <input
                          id="contact-subject"
                          name="subject"
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="How can we help?"
                          className="w-full bg-[#f4f7f4] dark:bg-[#0c1612] border border-transparent dark:border-[#1e3b30] rounded-2xl px-4 py-3.5 text-sm text-[#161e12] dark:text-[#E3F5EC] placeholder:text-gray-400 outline-none transition-all focus:ring-2 focus:ring-[#086948]"
                        />
                      </div>
                    </div>

                    {/* Row 3: Message Field */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          htmlFor="contact-message"
                          className="text-xs font-semibold text-[#161e12] dark:text-[#E3F5EC] block"
                        >
                          Message
                        </label>
                        <span
                          className={`text-xs ${
                            message.length > 2000
                              ? "text-destructive font-semibold"
                              : "text-[#555e58] dark:text-[#86A99A]"
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
                        placeholder="Tell us a little about your project"
                        className={`w-full bg-[#f4f7f4] dark:bg-[#0c1612] border rounded-2xl px-4 py-3.5 text-sm text-[#161e12] dark:text-[#E3F5EC] placeholder:text-gray-400 outline-none transition-all resize-none min-h-[130px] focus:ring-2 focus:ring-[#086948] ${
                          errors.message
                            ? "border-destructive focus:ring-destructive"
                            : "border-transparent dark:border-[#1e3b30]"
                        }`}
                      />
                      {errors.message && (
                        <p className="text-xs text-destructive font-medium mt-1.5">
                          {errors.message}
                        </p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-full bg-[#0C1511] hover:bg-[#202c25] dark:bg-[#8bd5b9] dark:hover:bg-[#a6f2d4] text-white dark:text-[#091413] py-4 text-sm sm:text-base font-semibold inline-flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending message...</span>
                          </>
                        ) : (
                          <>
                            <span>Send message</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                </>
              )}

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
