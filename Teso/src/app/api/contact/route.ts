import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import dns from "dns";
import { contactSchema } from "@/lib/auth/validation";

const RECIPIENT_EMAIL = "contact.tesolk@gmail.com";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid input";
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { name: cleanName, email: cleanEmail, message: cleanMessage, role } = parsed.data;

    // Map role values to human-friendly labels
    const roleLabels: Record<string, string> = {
      student: "Student / Self-Learner",
      teacher: "Teacher / Educator",
      institution: "Institute / School Administrator",
    };
    const roleLabel = (role && roleLabels[role]) || role || "Student / Self-Learner";

    // Verify SMTP credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Missing EMAIL_USER or EMAIL_PASS environment variables");
      return NextResponse.json(
        { error: "Email service is not configured on the server." },
        { status: 500 }
      );
    }

    // Resolve smtp.gmail.com to IPv4 to prevent IPv6 timeouts on Node/Windows
    const smtpHost = await new Promise<string>((resolve) => {
      dns.resolve4("smtp.gmail.com", (err, addresses) => {
        if (err || !addresses || !addresses.length) {
          resolve("smtp.gmail.com");
        } else {
          resolve(addresses[0]);
        }
      });
    });

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        servername: "smtp.gmail.com",
        rejectUnauthorized: false,
      },
    });

    const formattedDate = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Colombo",
      dateStyle: "full",
      timeStyle: "medium",
    });

    // Send email to contact.tesolk@gmail.com
    await transporter.sendMail({
      from: `"TESO Inquiries" <${process.env.EMAIL_USER}>`,
      to: RECIPIENT_EMAIL,
      replyTo: cleanEmail,
      subject: `New Inquiry from ${cleanName} (${roleLabel}) - TESO`,
      text: `New contact form submission received:

Name: ${cleanName}
Email: ${cleanEmail}
Role: ${roleLabel}
Date: ${formattedDate} (Sri Lanka Time)

Message:
${cleanMessage}
`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #1d4ed8, #2563eb); padding: 32px 28px; text-align: left; color: white; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
            .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }
            .body-content { padding: 28px; }
            .info-grid { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; }
            .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-weight: 600; color: #64748b; }
            .info-value { font-weight: 500; color: #0f172a; text-align: right; }
            .info-value a { color: #2563eb; text-decoration: none; }
            .message-box { background: #ffffff; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 0 10px 10px 0; background: #f1f5f9; margin-bottom: 24px; }
            .message-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 8px; }
            .message-text { font-size: 15px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; }
            .action-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; }
            .footer { padding: 20px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📬 New Contact Form Inquiry</h1>
              <p>Submitted via TESO Landing Page</p>
            </div>
            <div class="body-content">
              <div class="info-grid">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Sender:</td>
                    <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">${cleanName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email:</td>
                    <td style="padding: 8px 0; text-align: right;"><a href="mailto:${cleanEmail}" style="color: #2563eb; text-decoration: none;">${cleanEmail}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Role:</td>
                    <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right;">${roleLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Received:</td>
                    <td style="padding: 8px 0; color: #64748b; text-align: right;">${formattedDate}</td>
                  </tr>
                </table>
              </div>

              <div class="message-box">
                <div class="message-label">User Message:</div>
                <div class="message-text">${cleanMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
              </div>

              <div style="text-align: center; margin-top: 24px;">
                <a href="mailto:${cleanEmail}?subject=Re: Your Inquiry on TESO" class="action-btn">
                  Reply to ${cleanName}
                </a>
              </div>
            </div>
            <div class="footer">
              This message was sent from the TESO landing page contact form.<br>
              Recipient: ${RECIPIENT_EMAIL}
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return NextResponse.json(
      { success: true, message: "Your message has been sent successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending contact email:", error);
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
