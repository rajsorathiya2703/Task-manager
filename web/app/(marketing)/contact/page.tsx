import type { Metadata } from "next";
import { ContactSection } from "@/src/components/marketing/ContactSection";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Tell us what you need, whether it is a CRM, a website, an application or AI for your business. Send a message and we will get back to you.",
};

interface ContactPageProps {
  searchParams: Promise<{ subject?: string }>;
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams;
  const defaultSubject = params?.subject || "";

  return <ContactSection defaultSubject={defaultSubject} />;
}
