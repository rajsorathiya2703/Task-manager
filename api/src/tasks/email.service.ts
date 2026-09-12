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
    let user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;

    if (!user || !pass) {
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
      this.logger.log('Using SMTP credentials from environment variables');
    }

    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user: user,
        pass: pass,
      },
    });

    this.logger.log('Email Transporter initialized');
  }

  async sendInviteEmail(to: string, taskTitle: string, inviterName: string) {
    await this.initPromise;
    if (!this.transporter) {
      this.logger.error('Transporter not initialized yet');
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: '"Task Manager App" <noreply@taskmanager.local>', // sender address
        to, // list of receivers
        subject: `You have been invited to a task: ${taskTitle}`, // Subject line
        text: `Hello, ${inviterName} has invited you to collaborate on the task: "${taskTitle}". Login to your dashboard to view it.`, // plain text body
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
              <a href="http://localhost:3000/tasks" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 40px; text-align: center;">
              This is an automated message. Please do not reply.
            </p>
          </div>
        `, // html body
      });

      this.logger.log(`Message sent: ${info.messageId}`);
      // Preview only available when sending through an Ethereal account
      this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
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
      const baseUrl = process.env.APP_URL || 'http://localhost:3000';
      const taskUrl = taskId ? `${baseUrl}/tasks/${taskId}` : `${baseUrl}/tasks`;
      const projectSnippet = projectName ? ` in project <strong>${projectName}</strong>` : '';

      const info = await this.transporter.sendMail({
        from: '"Task Manager App" <noreply@taskmanager.local>',
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
