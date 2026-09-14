import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dns from 'dns';

@Injectable()
export class DayOffMailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(DayOffMailService.name);
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initTransporter();
  }

  private async initTransporter() {
    if (process.env.BREVO_API_KEY?.trim()) {
      this.logger.log('Brevo API Key detected for Day Off email delivery (Port 443 HTTPS REST API).');
      return;
    }

    const user = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : undefined;
    const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : undefined;

    if (!user || !pass) {
      this.logger.warn('Neither BREVO_API_KEY nor SMTP_USER/SMTP_PASS are set for DayOffMailService.');
      return;
    }

    const rawPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const isGmail = host.includes('gmail');
    const port = rawPort === 587 && isGmail ? 465 : rawPort;
    const isSecure = port === 465;

    let connectHost = host;
    try {
      const resolved = await dns.promises.lookup(host, { family: 4 });
      if (resolved && resolved.address) {
        connectHost = resolved.address;
      }
    } catch {
      // Use connectHost default
    }

    this.transporter = nodemailer.createTransport({
      host: connectHost,
      port: port,
      secure: isSecure,
      auth: { user, pass },
      tls: { servername: host, rejectUnauthorized: false },
      connectionTimeout: 20000,
    } as any);
  }

  private getSenderEmail(): string {
    return (
      process.env.BREVO_SENDER_EMAIL ||
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      'noreply@taskmanager.com'
    ).trim();
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<boolean> {
    const brevoApiKey = process.env.BREVO_API_KEY?.trim();

    // 1. Send via Brevo HTTPS REST API (prioritized)
    if (brevoApiKey) {
      try {
        const senderEmail = this.getSenderEmail();
        const senderName = process.env.BREVO_SENDER_NAME || 'Task Manager App';

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
            to: [{ email: options.to }],
            subject: options.subject,
            htmlContent: options.html,
            textContent: options.text,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          this.logger.error(`[Brevo API Error ${response.status}] Failed sending to ${options.to}: ${errText}`);
          return false;
        }

        const data: any = await response.json().catch(() => ({}));
        this.logger.log(`[Brevo DayOff] Email sent to ${options.to} (MessageId: ${data?.messageId || 'sent'})`);
        return true;
      } catch (err: any) {
        this.logger.error(`[Brevo DayOff] Network error sending to ${options.to}: ${err?.message || err}`);
        return false;
      }
    }

    // 2. Fallback to Nodemailer SMTP
    await this.initPromise;
    if (!this.transporter) {
      this.logger.warn(`No transporter available for DayOff email to ${options.to}`);
      return false;
    }

    try {
      const fromAddress = `"Task Manager" <${this.getSenderEmail()}>`;
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      this.logger.log(`[SMTP DayOff] Email sent to ${options.to}: ${info.messageId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`[SMTP DayOff] Failed sending to ${options.to}: ${error.message}`);
      return false;
    }
  }

  private getAppUrl(): string {
    const url = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    return url.replace(/\/+$/, '');
  }

  private getApiUrl(): string {
    const url = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    return url.replace(/\/+$/, '');
  }

  async sendLeaveRequestToAdmin(params: {
    adminEmail: string;
    applicationId: string;
    approvalToken: string;
    employeeName: string;
    employeeEmail?: string;
    leaveTypeName: string;
    fromDateStr: string;
    toDateStr: string;
    daysCount: number;
    reason: string;
    description?: string;
  }): Promise<boolean> {
    const apiUrl = this.getApiUrl();
    const approveUrl = `${apiUrl}/day-off/applications/${params.applicationId}/approve?token=${encodeURIComponent(params.approvalToken)}`;
    const appUrl = this.getAppUrl();

    const subject = `[Leave Request] ${params.employeeName} - ${params.leaveTypeName} (${params.daysCount} day${params.daysCount > 1 ? 's' : ''})`;
    const text = `New Leave Request:\nEmployee: ${params.employeeName} (${params.employeeEmail || 'N/A'})\nLeave Type: ${params.leaveTypeName}\nDuration: ${params.fromDateStr} to ${params.toDateStr} (${params.daysCount} days)\nReason: ${params.reason}\n\nApprove directly: ${approveUrl}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px;">
          <h2 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 700;">Leave Application Received</h2>
          <p style="margin: 6px 0 0 0; color: #64748b; font-size: 14px;">An employee has requested time off and is awaiting your approval.</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 15px;">
          <tr>
            <td style="padding: 10px 0; color: #64748b; width: 140px; font-weight: 500;">Employee:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${params.employeeName} ${params.employeeEmail ? `<span style="color: #64748b; font-weight: 400;">(${params.employeeEmail})</span>` : ''}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Leave Type:</td>
            <td style="padding: 10px 0; color: #3b82f6; font-weight: 600;">${params.leaveTypeName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Date Range:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${params.fromDateStr} &rarr; ${params.toDateStr}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Total Duration:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${params.daysCount} day${params.daysCount > 1 ? 's' : ''}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Reason:</td>
            <td style="padding: 10px 0; color: #0f172a;">${params.reason}</td>
          </tr>
          ${params.description ? `
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 500; vertical-align: top;">Description:</td>
            <td style="padding: 10px 0; color: #334155; line-height: 1.5;">${params.description}</td>
          </tr>` : ''}
        </table>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <p style="margin: 0 0 16px 0; color: #334155; font-size: 14px;">Click the button below to approve this leave immediately with one click:</p>
          <a href="${approveUrl}" style="background-color: #16a34a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);">
            &check; Approve Leave
          </a>
        </div>

        <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          <a href="${appUrl}/dayoff" style="color: #64748b; text-decoration: underline; font-size: 13px;">View Leave Calendar on Task Manager</a>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">This is an automated notification. The approval button is securely token-authorized.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: params.adminEmail,
      subject,
      text,
      html,
    });
  }

  async sendLeaveApprovedToEmployee(params: {
    employeeEmail: string;
    employeeName: string;
    leaveTypeName: string;
    fromDateStr: string;
    toDateStr: string;
    daysCount: number;
    approvedAtStr: string;
  }): Promise<boolean> {
    const appUrl = this.getAppUrl();
    const subject = `Your Leave Request Has Been Approved: ${params.leaveTypeName}`;
    const text = `Hello ${params.employeeName},\n\nGreat news! Your leave request for ${params.leaveTypeName} (${params.fromDateStr} to ${params.toDateStr}, ${params.daysCount} days) has been approved.\n\nView calendar: ${appUrl}/dayoff`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="border-bottom: 2px solid #16a34a; padding-bottom: 16px; margin-bottom: 24px;">
          <span style="background-color: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">Approved</span>
          <h2 style="margin: 10px 0 0 0; color: #0f172a; font-size: 22px; font-weight: 700;">Leave Request Approved!</h2>
          <p style="margin: 6px 0 0 0; color: #64748b; font-size: 14px;">Hello ${params.employeeName}, your requested time off has been approved.</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 15px;">
          <tr>
            <td style="padding: 10px 0; color: #64748b; width: 140px; font-weight: 500;">Leave Type:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${params.leaveTypeName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Dates:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${params.fromDateStr} &rarr; ${params.toDateStr}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Duration:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${params.daysCount} day${params.daysCount > 1 ? 's' : ''}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Approved On:</td>
            <td style="padding: 10px 0; color: #15803d; font-weight: 600;">${params.approvedAtStr}</td>
          </tr>
        </table>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${appUrl}/dayoff" style="background-color: #3b82f6; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
            View Leave Calendar
          </a>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: params.employeeEmail,
      subject,
      text,
      html,
    });
  }
}
