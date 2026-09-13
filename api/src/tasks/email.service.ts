import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initTransporter();
  }

  private async initTransporter() {
    let user = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : undefined;
    // Strip spaces that often get included when copying Google App Passwords
    let pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : undefined;

    if (!user || !pass) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn(
          'CRITICAL: SMTP_USER or SMTP_PASS is missing in production! Emails will not be delivered to users.',
        );
      }
      // Generate test SMTP service account from ethereal.email if no env variables provided
      try {
        const testAccount = await nodemailer.createTestAccount();
        user = testAccount.user;
        pass = testAccount.pass;
        this.logger.log(`Generated Ethereal test credentials: ${user} / ${pass}`);
      } catch (err) {
        this.logger.error('Failed to create Ethereal test account (possibly offline). Emails will not be sent.', err);
        return; // Exit early, transporter remains undefined
      }
    } else {
      this.logger.log(`Using SMTP credentials from environment variables (User: ${user})`);
    }

    const rawPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const isGmail = host.includes('gmail');
    // On Render, port 587 frequently times out or blocks; switch to 465 with SSL for Gmail
    const port = rawPort === 587 && isGmail ? 465 : rawPort;
    const isSecure = port === 465;

    this.transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: isSecure, // true for 465 (SSL), false for other ports
      auth: {
        user: user,
        pass: pass,
      },
      // CRITICAL FOR RENDER: Force IPv4 to prevent "connect ENETUNREACH 2607:f8b0... (IPv6)"
      family: 4,
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 30000,
      tls: {
        rejectUnauthorized: false,
      },
    } as any);

    // Verify SMTP connection on startup so connection errors appear directly in Render runtime logs
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(`SMTP Connection Failed: ${error.message}`, error.stack);
      } else {
        this.logger.log('SMTP Server verified successfully and ready to deliver emails');
      }
    });

    this.logger.log(`Email Transporter initialized (Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}, Port: ${port})`);
  }

  private getFromAddress(): string {
    const senderEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@taskmanager.com';
    return `"Task Manager App" <${senderEmail}>`;
  }

  async sendInviteEmail(to: string, taskTitle: string, inviterName: string) {
    await this.initPromise;
    if (!this.transporter) {
      this.logger.error('Transporter not initialized yet');
      return;
    }

    try {
      const baseUrl = process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
      const info = await this.transporter.sendMail({
        from: this.getFromAddress(),
        to,
        subject: `You have been invited to a task: ${taskTitle}`,
        text: `Hello, ${inviterName} has invited you to collaborate on the task: "${taskTitle}". Login to your dashboard to view it.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #333;">Task Invitation</h2>
            <p style="color: #555; font-size: 16px;">
              Hello,
            </p>
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
        `,
      });

      this.logger.log(`Message sent: ${info.messageId}`);
      if (nodemailer.getTestMessageUrl(info)) {
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (error) {
      this.logger.error('Failed to send invite email', error);
    }
  }

  async sendTaskAssignmentEmail(
    to: string,
    taskTitle: string,
    assignerName: string,
    employeeName: string,
    taskId?: string,
    projectName?: string,
  ) {
    await this.initPromise;
    if (!this.transporter) {
      this.logger.error('Transporter not initialized yet');
      return;
    }

    try {
      const baseUrl = process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
      const taskUrl = taskId ? `${baseUrl}/tasks/${taskId}` : `${baseUrl}/tasks`;
      const projectSnippet = projectName ? ` in project <strong>${projectName}</strong>` : '';

      const info = await this.transporter.sendMail({
        from: this.getFromAddress(),
        to,
        subject: `New Task Assigned: ${taskTitle}`,
        text: `Hello ${employeeName},\n\n${assignerName} has assigned a new task to you: "${taskTitle}"${projectName ? ` in project "${projectName}"` : ''}.\n\nView it here: ${taskUrl}`,
        html: `
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
        `,
      });

      this.logger.log(`Task assignment email sent to ${to}: ${info.messageId}`);
      if (nodemailer.getTestMessageUrl(info)) {
        this.logger.log(`Assignment Email Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send task assignment email to ${to}`, error);
    }
  }
}
