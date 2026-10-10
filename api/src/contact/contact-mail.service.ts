/**
 * Environment variable documentation:
 * - CONTACT_RECEIVER_EMAIL: Destination inbox address for public website contact queries.
 *   Falls back to BREVO_SENDER_EMAIL, then SMTP_USER if not set.
 * - BREVO_API_KEY: Brevo (Sendinblue) API key. If present, emails are dispatched via HTTPS REST API (Port 443).
 * - BREVO_SENDER_EMAIL / BREVO_SENDER_NAME: Verified sender information for Brevo.
 * - SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS: Fallback credentials for Nodemailer SMTP transport.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export function escapeHtml(str?: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ContactQueryInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

@Injectable()
export class ContactMailService {
  private readonly logger = new Logger(ContactMailService.name);

  private getReceiverEmail(): string {
    return (
      process.env.CONTACT_RECEIVER_EMAIL ||
      process.env.BREVO_SENDER_EMAIL ||
      process.env.SMTP_USER ||
      ''
    ).trim();
  }

  private getSenderEmail(): string {
    return (
      process.env.BREVO_SENDER_EMAIL ||
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      'noreply@pyramid.com'
    ).trim();
  }

  private getSenderName(): string {
    return (process.env.BREVO_SENDER_NAME || 'Pyramid Website').trim();
  }

  async sendContactQuery(input: ContactQueryInput): Promise<boolean> {
    try {
      const receiver = this.getReceiverEmail();
      if (!receiver) {
        this.logger.error(
          'Cannot send contact email: No recipient address configured. Please set CONTACT_RECEIVER_EMAIL, BREVO_SENDER_EMAIL, or SMTP_USER.',
        );
        return false;
      }

      // Sanitize subject line removing any CR / LF characters
      const sanitizedSubjectPart = (input.subject || 'New message')
        .replace(/[\r\n]+/g, ' ')
        .trim();
      const emailSubject = `[Website Query] ${sanitizedSubjectPart}`;

      // Escape all visitor inputs for HTML body
      const safeName = escapeHtml(input.name);
      const safeEmail = escapeHtml(input.email);
      const safePhone = input.phone ? escapeHtml(input.phone) : '';
      const safeSubject = escapeHtml(input.subject || 'New message');
      const safeMessageWithBr = escapeHtml(input.message).replace(/\r?\n/g, '<br>');

      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">New Website Contact Query</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 120px;">Name:</td>
              <td style="padding: 8px 0; color: #0f172a;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email:</td>
              <td style="padding: 8px 0; color: #0f172a;"><a href="mailto:${safeEmail}" style="color: #2563eb;">${safeEmail}</a></td>
            </tr>
            ${
              safePhone
                ? `<tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Phone:</td>
                    <td style="padding: 8px 0; color: #0f172a;">${safePhone}</td>
                  </tr>`
                : ''
            }
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Subject:</td>
              <td style="padding: 8px 0; color: #0f172a;">${safeSubject}</td>
            </tr>
          </table>
          <div style="margin-top: 16px;">
            <p style="color: #64748b; font-weight: 600; margin-bottom: 8px;">Message:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; font-size: 14px; color: #334155;">
              ${safeMessageWithBr}
            </div>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px;">
            You can reply directly to this email to respond to the visitor (${safeEmail}).
          </p>
        </div>
      `.trim();

      const textContent = `New Website Contact Query\n\nName: ${input.name}\nEmail: ${input.email}${
        input.phone ? `\nPhone: ${input.phone}` : ''
      }\nSubject: ${input.subject || 'New message'}\n\nMessage:\n${input.message}\n`;

      const brevoApiKey = process.env.BREVO_API_KEY?.trim();

      // 1. Send via Brevo API if configured
      if (brevoApiKey) {
        try {
          const senderEmail = this.getSenderEmail();
          const senderName = this.getSenderName();

          const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'api-key': brevoApiKey,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              sender: {
                name: senderName,
                email: senderEmail,
              },
              to: [{ email: receiver }],
              replyTo: {
                email: input.email.trim(),
                name: input.name.trim(),
              },
              subject: emailSubject,
              htmlContent: htmlContent,
              textContent: textContent,
            }),
          });

          if (!response.ok) {
            const errorDetails = await response.text();
            this.logger.error(
              `[Brevo API Error ${response.status}] Failed to deliver query to ${receiver}: ${errorDetails}`,
            );
            return false;
          }

          const data: any = await response.json().catch(() => ({}));
          this.logger.log(
            `[Brevo] Contact query successfully forwarded to ${receiver} (MessageId: ${data?.messageId || 'sent'})`,
          );
          return true;
        } catch (brevoErr: any) {
          this.logger.error(
            `[Brevo] Network error dispatching contact query: ${brevoErr?.message || brevoErr}`,
            brevoErr?.stack,
          );
          return false;
        }
      }

      // 2. Fallback to Nodemailer SMTP
      try {
        const host = process.env.SMTP_HOST || 'smtp.gmail.com';
        const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
        const isSecure = port === 465;
        const user = process.env.SMTP_USER?.trim();
        const pass = process.env.SMTP_PASS?.replace(/\s+/g, '');

        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: isSecure,
          auth: user && pass ? { user, pass } : undefined,
        });

        const fromAddress = `"${this.getSenderName()}" <${this.getSenderEmail()}>`;
        const info = await transporter.sendMail({
          from: fromAddress,
          to: receiver,
          replyTo: {
            name: input.name.trim(),
            address: input.email.trim(),
          },
          subject: emailSubject,
          text: textContent,
          html: htmlContent,
        });

        this.logger.log(`[SMTP] Contact query forwarded to ${receiver}: ${info.messageId}`);
        return true;
      } catch (smtpErr: any) {
        this.logger.error(
          `[SMTP] Failed to send contact query to ${receiver}: ${smtpErr?.message || smtpErr}`,
          smtpErr?.stack,
        );
        return false;
      }
    } catch (unexpectedErr: any) {
      this.logger.error(
        `Unexpected error in sendContactQuery: ${unexpectedErr?.message || unexpectedErr}`,
        unexpectedErr?.stack,
      );
      return false;
    }
  }
}
