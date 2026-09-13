import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dns from 'dns';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initTransporter();
  }

  private async initTransporter() {
    // If Brevo API Key is configured, prioritize Brevo HTTPS API (port 443)
    // which bypasses Render's firewall blocking outbound SMTP ports 25, 465, and 587.
    if (process.env.BREVO_API_KEY?.trim()) {
      this.logger.log(
        'Brevo API Key detected. Emails will be sent via Brevo HTTPS REST API (Port 443 - completely unblocked on Render).',
      );
      return;
    }

    let user = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : undefined;
    let pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : undefined;

    if (!user || !pass) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn(
          'CRITICAL: Neither BREVO_API_KEY nor SMTP_USER/SMTP_PASS are configured! Real emails will not be sent.',
        );
      }
      try {
        const testAccount = await nodemailer.createTestAccount();
        user = testAccount.user;
        pass = testAccount.pass;
        this.logger.log(`Generated Ethereal test credentials: ${user} / ${pass}`);
      } catch (err) {
        this.logger.error('Failed to create Ethereal test account. Emails will not be sent.', err);
        return;
      }
    } else {
      this.logger.log(`Using SMTP credentials from environment variables (User: ${user})`);
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
        this.logger.log(`Resolved SMTP host ${host} to IPv4: ${connectHost}`);
      }
    } catch (dnsErr: any) {
      this.logger.warn(`Could not resolve IPv4 for ${host}, using hostname directly: ${dnsErr?.message || dnsErr}`);
    }

    this.transporter = nodemailer.createTransport({
      host: connectHost,
      port: port,
      secure: isSecure,
      auth: {
        user: user,
        pass: pass,
      },
      tls: {
        servername: host,
        rejectUnauthorized: false,
      },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 30000,
    } as any);

    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(`SMTP Connection Failed: ${error.message}`, error.stack);
      } else {
        this.logger.log('SMTP Server verified successfully and ready to deliver emails');
      }
    });

    this.logger.log(`Email Transporter initialized (Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}, Port: ${port})`);
  }

  private getSenderEmail(): string {
    return (
      process.env.BREVO_SENDER_EMAIL ||
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      ''
    ).trim();
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<boolean> {
    const brevoApiKey = process.env.BREVO_API_KEY?.trim();

    // 1. Send via Brevo HTTPS REST API if key is present (never blocked on cloud platforms)
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
          const errorDetails = await response.text();
          this.logger.error(
            `[Brevo API Error ${response.status}] Failed to deliver to ${options.to}: ${errorDetails}`,
          );
          return false;
        }

        const data: any = await response.json().catch(() => ({}));
        this.logger.log(`[Brevo] Email delivered to ${options.to} (MessageId: ${data?.messageId || 'sent'})`);
        return true;
      } catch (err: any) {
        this.logger.error(`[Brevo] Network error while sending to ${options.to}: ${err?.message || err}`, err?.stack);
        return false;
      }
    }

    // 2. Fallback to Nodemailer SMTP
    await this.initPromise;
    if (!this.transporter) {
      this.logger.error('Transporter not initialized yet');
      return false;
    }

    try {
      const fromAddress = `"Task Manager App" <${this.getSenderEmail()}>`;
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`[SMTP] Message sent to ${options.to}: ${info.messageId}`);
      if (nodemailer.getTestMessageUrl(info)) {
        this.logger.log(`[SMTP] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      return true;
    } catch (error: any) {
      this.logger.error(`[SMTP] Failed to send email to ${options.to}`, error);
      return false;
    }
  }

  private getBaseUrl(): string {
    const configuredUrl =
      process.env.APP_URL ||
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL;

    if (configuredUrl && configuredUrl.trim()) {
      return configuredUrl.trim().replace(/\/+$/, '');
    }

    if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.trim()) {
      const origins = process.env.CORS_ORIGIN.split(',').map((o) => o.trim());
      const vercelOrigin = origins.find((o) => o.includes('vercel.app'));
      if (vercelOrigin) {
        return vercelOrigin.replace(/\/+$/, '');
      }
      const nonLocalhost = origins.find((o) => !o.includes('localhost') && !o.includes('127.0.0.1'));
      if (nonLocalhost) {
        return nonLocalhost.replace(/\/+$/, '');
      }
    }

    return 'https://web-zeta-olive-95.vercel.app';
  }

  async sendInviteEmail(to: string, taskTitle: string, inviterName: string) {
    const baseUrl = this.getBaseUrl();
    const text = `Hello, ${inviterName} has invited you to collaborate on the task: "${taskTitle}". Login to your dashboard to view it: ${baseUrl}/tasks`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
        <h2 style="color: #333;">Task Invitation</h2>
        <p style="color: #555; font-size: 16px;">Hello,</p>
        <p style="color: #555; font-size: 16px;">
          <strong>${inviterName}</strong> has invited you to collaborate on the task:
        </p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin: 0; color: #222;">${taskTitle}</h3>
        </div>
        <p style="color: #555; font-size: 16px;">
          Please log in to your dashboard to view and collaborate on this task.
        </p>
        <div style="margin-top: 30px; text-align: center;">
          <a href="${baseUrl}/tasks" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 40px; text-align: center;">
          This is an automated message. Please do not reply.
        </p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `You have been invited to a task: ${taskTitle}`,
      text,
      html,
    });
  }

  async sendTaskAssignmentEmail(
    to: string,
    taskTitle: string,
    assignerName: string,
    employeeName: string,
    taskId?: string,
    projectName?: string,
  ) {
    const baseUrl = this.getBaseUrl();
    const taskUrl = taskId ? `${baseUrl}/tasks/${taskId}` : `${baseUrl}/tasks`;
    const projectSnippet = projectName ? ` in project <strong>${projectName}</strong>` : '';

    const text = `Hello ${employeeName},\n\n${assignerName} has assigned a new task to you: "${taskTitle}"${projectName ? ` in project "${projectName}"` : ''}.\n\nView it here: ${taskUrl}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
        <h2 style="color: #333; margin-top: 0;">New Task Assigned</h2>
        <p style="color: #555; font-size: 16px;">
          Hello <strong>${employeeName}</strong>,
        </p>
        <p style="color: #555; font-size: 16px;">
          <strong>${assignerName}</strong> has assigned a new task to you${projectSnippet}:
        </p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0070f3;">
          <h3 style="margin: 0; color: #222;">${taskTitle}</h3>
        </div>
        <p style="color: #555; font-size: 16px;">
          Please log in to your dashboard to review task specifications, log time, and start working.
        </p>
        <div style="margin-top: 30px; text-align: center;">
          <a href="${taskUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Task</a>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 40px; text-align: center;">
          This is an automated notification from Task Manager. Please do not reply.
        </p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `New Task Assigned: ${taskTitle}`,
      text,
      html,
    });
  }
}
