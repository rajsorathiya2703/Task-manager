import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

function escapeHtml(str?: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { message: "Invalid request payload." },
        { status: 400 }
      );
    }

    const { name, email, phone, subject, message, _gotcha } = body;

    // Honeypot check: If bot filled the hidden _gotcha field, silently accept
    if (_gotcha && String(_gotcha).trim().length > 0) {
      return NextResponse.json({ success: true });
    }

    // Input Validation
    const trimmedName = (name || "").trim();
    const trimmedEmail = (email || "").trim();
    const trimmedMessage = (message || "").trim();
    const trimmedSubject = (subject || "New project inquiry").trim();
    const trimmedPhone = (phone || "").trim();

    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json(
        { message: "Name must be at least 2 characters." },
        { status: 400 }
      );
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json(
        { message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!trimmedMessage || trimmedMessage.length < 5) {
      return NextResponse.json(
        { message: "Message must be at least 5 characters." },
        { status: 400 }
      );
    }

    // SMTP Credentials
    const user = process.env.SMTP_USER || "raj2732005@gmail.com";
    const pass = (process.env.SMTP_PASS || "nyprmiegfunoqtzw").replace(/\s+/g, "");
    const receiver = process.env.CONTACT_RECEIVER_EMAIL || "raj2732005@gmail.com";
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const rawPort = parseInt(process.env.SMTP_PORT || "587", 10);

    const isGmail = host.includes("gmail") || user.endsWith("@gmail.com");

    const transporter = isGmail
      ? nodemailer.createTransport({
          service: "gmail",
          auth: { user, pass },
        })
      : nodemailer.createTransport({
          host,
          port: rawPort,
          secure: rawPort === 465,
          auth: { user, pass },
        });

    const safeName = escapeHtml(trimmedName);
    const safeEmail = escapeHtml(trimmedEmail);
    const safePhone = escapeHtml(trimmedPhone);
    const safeSubject = escapeHtml(trimmedSubject);
    const safeMessageWithBr = escapeHtml(trimmedMessage).replace(/\r?\n/g, "<br>");

    const emailSubject = `[Website Contact] ${trimmedSubject} - ${trimmedName}`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #161e12; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #086948; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #086948; margin: 0; font-size: 22px; font-weight: 800;">Own Technology &mdash; New Contact Message</h2>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Received from the public website contact form</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 130px; font-size: 14px;">Sender Name:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 700; font-size: 15px;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 600; font-size: 14px;">Email Address:</td>
            <td style="padding: 10px 0; color: #086948; font-weight: 600; font-size: 15px;">
              <a href="mailto:${safeEmail}" style="color: #086948; text-decoration: underline;">${safeEmail}</a>
            </td>
          </tr>
          ${
            safePhone
              ? `<tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600; font-size: 14px;">Phone Number:</td>
                  <td style="padding: 10px 0; color: #0f172a; font-size: 14px;">${safePhone}</td>
                </tr>`
              : ""
          }
          <tr>
            <td style="padding: 10px 0; color: #64748b; font-weight: 600; font-size: 14px;">Subject:</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 600; font-size: 14px;">${safeSubject}</td>
          </tr>
        </table>

        <div style="margin-top: 16px;">
          <p style="color: #64748b; font-weight: 600; margin-bottom: 8px; font-size: 14px;">Project Message:</p>
          <div style="background-color: #f4f7f4; border: 1px solid #dbe8df; border-radius: 12px; padding: 16px; font-size: 14px; color: #1e293b; line-height: 1.7;">
            ${safeMessageWithBr}
          </div>
        </div>

        <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
          <p style="margin: 0;">You can reply directly to this email to respond to <strong>${safeName}</strong> at <strong>${safeEmail}</strong>.</p>
        </div>
      </div>
    `.trim();

    const textContent = `New Website Contact Message\n\nName: ${trimmedName}\nEmail: ${trimmedEmail}${
      trimmedPhone ? `\nPhone: ${trimmedPhone}` : ""
    }\nSubject: ${trimmedSubject}\n\nMessage:\n${trimmedMessage}\n`;

    await transporter.sendMail({
      from: `"Own Technology Website" <${user}>`,
      to: receiver,
      replyTo: `"${trimmedName}" <${trimmedEmail}>`,
      subject: emailSubject,
      text: textContent,
      html: htmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to deliver email.";
    console.error("[Contact API] Error sending email to inbox:", err);
    return NextResponse.json(
      { message: `Email delivery failed: ${errorMsg}` },
      { status: 500 }
    );
  }
}
