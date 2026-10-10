import nodemailer from "nodemailer";
import { env } from "../config/env";
import { formatDateInTimezone } from "../utils/timezone";

// Create transporter if email is configured
export const transporter =
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: env.SMTP_HOST, // mail.southernscience.edu.lk
        port: Number(env.SMTP_PORT) || 465, // 465
        secure: env.SMTP_SECURE ?? false, // true -> SSL
        auth: {
          user: env.SMTP_USER, // 360@southernscience.edu.lk
          pass: env.SMTP_PASS,
        },
        tls: {
          // cPanel-style servers sometimes need this if cert is not perfect
          rejectUnauthorized: false,
        },
      })
    : null;

export async function sendCircleInviteEmail(
  toEmail: string,
  inviterName: string,
  circleName: string,
  circleId: string,
  role: "admin" | "member"
): Promise<void> {
  if (!transporter) {
    console.warn("Email not configured - skipping invite email to", toEmail);
    return;
  }

  const acceptUrl = `${env.APP_URL}/api/circles/${circleId}/accept-invite`;
  const rejectUrl = `${env.APP_URL}/api/circles/${circleId}/reject-invite`;

  const mailOptions = {
    from: env.SMTP_FROM || `Serve Family <noreply@api.servefamily.com>`,
    to: toEmail,
    subject: `You've been invited to join ${circleName} on Serve Family`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 24px; margin: 10px 5px; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .accept { background-color: #4CAF50; color: white; }
            .reject { background-color: #f44336; color: white; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .divider { border-top: 1px solid #ddd; margin: 25px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Serve Family Circle Invitation</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p><strong>${inviterName}</strong> has invited you to join the circle <strong>"${circleName}"</strong> as a <strong>${role}</strong>.</p>

              <p>You can accept or reject this invitation by clicking the buttons below. The invitation will appear in your pending invitations list.</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${acceptUrl}" class="button accept">Accept Invitation</a>
                <a href="${rejectUrl}" class="button reject">Reject Invitation</a>
              </div>

              <div class="divider"></div>

              <p><small><strong>Note:</strong> You need to be logged in to accept or reject the invitation. If you don't have an account, you'll need to sign up first.</small></p>
            </div>
            <div class="footer">
              <p>This is an automated message from Serve Family. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Life 360 Circle Invitation

Hello,

${inviterName} has invited you to join the circle "${circleName}" as a ${role}.

You can accept or reject this invitation by clicking the links below. The invitation will appear in your pending invitations list.

Accept: ${acceptUrl}
Reject: ${rejectUrl}

Note: You need to be logged in to accept or reject the invitation. If you don't have an account, you'll need to sign up first.

This is an automated message from Serve Family. Please do not reply to this email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Invite email sent to ${toEmail}`, info.messageId);
  } catch (error) {
    console.error("Failed to send invite email:", error);
    // Log more details for debugging
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    throw error;
  }
}

export async function sendEmailVerificationCode(
  toEmail: string,
  userName: string,
  verificationCode: string,
  codeExpiresAt: Date
): Promise<void> {
  if (!transporter) {
    console.warn("Email not configured - skipping verification email to", toEmail);
    console.log(`Verification code for ${toEmail}: ${verificationCode}`);
    return;
  }

  const expiresDate = formatDateInTimezone(codeExpiresAt, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

  const mailOptions = {
    from: env.SMTP_FROM || `Serve Family <noreply@api.servefamily.com>`,
    to: toEmail,
    subject: `Verify your email address`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .code-box { background-color: #fff; border: 3px solid #4CAF50; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4CAF50; font-family: 'Courier New', monospace; }
            .code-label { font-size: 14px; color: #666; margin-bottom: 10px; text-transform: uppercase; }
            .expires { font-size: 12px; color: #999; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>Thank you for registering! Please verify your email address by entering the code below:</p>
              
              <div class="code-box">
                <div class="code-label">Your Verification Code</div>
                <div class="code">${verificationCode}</div>
                <div class="expires">Expires: ${expiresDate}</div>
              </div>

              <p>This code will expire in 30 minutes. If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Serve Family. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Verify Your Email

Hello ${userName},

Thank you for registering! Please verify your email address by entering the code below:

YOUR VERIFICATION CODE: ${verificationCode}
Expires: ${expiresDate}

This code will expire in 30 minutes. If you didn't create an account, please ignore this email.

This is an automated message from Serve Family. Please do not reply to this email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${toEmail}`, info.messageId);
  } catch (error) {
    console.error("Failed to send verification email:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    throw error;
  }
}

export async function sendPasswordResetEmail(
  toEmail: string,
  userName: string,
  resetCode: string,
  codeExpiresAt: Date
): Promise<void> {
  if (!transporter) {
    console.warn("Email not configured - skipping password reset email to", toEmail);
    console.log(`Password reset code for ${toEmail}: ${resetCode}`);
    return;
  }

  const expiresDate = formatDateInTimezone(codeExpiresAt, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

  const mailOptions = {
    from: env.SMTP_FROM || `Serve Family <noreply@api.servefamily.com>`,
    to: toEmail,
    subject: `Reset your password`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .code-box { background-color: #fff; border: 3px solid #f44336; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #f44336; font-family: 'Courier New', monospace; }
            .code-label { font-size: 14px; color: #666; margin-bottom: 10px; text-transform: uppercase; }
            .expires { font-size: 12px; color: #999; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reset Your Password</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>We received a request to reset your password. Use the code below to reset your password:</p>
              
              <div class="code-box">
                <div class="code-label">Your Password Reset Code</div>
                <div class="code">${resetCode}</div>
                <div class="expires">Expires: ${expiresDate}</div>
              </div>

              <div class="warning">
                <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
              </div>

              <p>This code will expire in 15 minutes. For security reasons, please do not share this code with anyone.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Serve Family. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Reset Your Password

Hello ${userName},

We received a request to reset your password. Use the code below to reset your password:

YOUR PASSWORD RESET CODE: ${resetCode}
Expires: ${expiresDate}

Security Notice: If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

This code will expire in 15 minutes. For security reasons, please do not share this code with anyone.

This is an automated message from Serve Family. Please do not reply to this email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${toEmail}`, info.messageId);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    throw error;
  }
}

export async function sendAgentCredentialsEmail(
  toEmail: string,
  agentName: string,
  password: string,
  locationName?: string,
  portalUrl?: string
): Promise<boolean> {
  const defaultAppUrl = env.APP_URL && !env.APP_URL.includes("localhost") ? env.APP_URL : "https://api.servefamily.com";
  const loginUrl = portalUrl || `${defaultAppUrl.replace(/\/$/, "")}/agent/`;

  if (!transporter) {
    console.warn("⚠️ Email transporter not configured - skipping agent credentials email to", toEmail);
    console.log(`🔑 [AGENT CREDENTIALS] Email: ${toEmail} | Password: ${password} | Portal: ${loginUrl}`);
    return false;
  }

  const mailOptions = {
    from: env.SMTP_FROM || `Serve Family <noreply@api.servefamily.com>`,
    to: toEmail,
    subject: `Your Regional Agent Account Credentials - Serve Family`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
            .header p { margin: 5px 0 0 0; opacity: 0.9; font-size: 14px; }
            .content { padding: 32px 28px; }
            .cred-card { background-color: #f0fdf4; border: 1.5px dashed #10b981; border-radius: 10px; padding: 20px; margin: 24px 0; }
            .cred-item { margin-bottom: 12px; }
            .cred-item:last-child { margin-bottom: 0; }
            .cred-label { font-size: 12px; text-transform: uppercase; color: #047857; font-weight: 700; letter-spacing: 0.5px; }
            .cred-value { font-size: 18px; font-weight: 700; color: #064e3b; font-family: 'Courier New', monospace; margin-top: 2px; }
            .btn-login { display: inline-block; background-color: #059669; color: white !important; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; margin: 20px 0 10px 0; text-align: center; }
            .footer { background-color: #f1f5f9; text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
            .info-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin-top: 20px; font-size: 13px; color: #1e40af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Serve Family Regional Agent Portal</h1>
              <p>Welcome to the Agent Fleet Management System</p>
            </div>
            <div class="content">
              <p>Hello <strong>${agentName}</strong>,</p>
              <p>Your Regional Agent account has been successfully created${locationName ? ` for <strong>${locationName}</strong>` : ''}. You now have access to manage regional driver approvals and monitor the local taxi fleet.</p>
              
              <div class="cred-card">
                <div class="cred-item">
                  <div class="cred-label">Login Email</div>
                  <div class="cred-value" style="font-family: inherit;">${toEmail}</div>
                </div>
                <div class="cred-item" style="margin-top: 14px;">
                  <div class="cred-label">System Password</div>
                  <div class="cred-value">${password}</div>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${loginUrl}" class="btn-login" target="_blank">Access Regional Agent Portal</a>
              </div>

              <div class="info-box">
                <strong>🔒 Security Recommendation:</strong> Please log in to your account using the credentials above. We recommend keeping these credentials secure and changing your password after your initial login.
              </div>
            </div>
            <div class="footer">
              <p>This is an automated operational email from Serve Family Regional Management.</p>
              <p>© ${new Date().getFullYear()} Serve Family. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Serve Family Regional Agent Portal Credentials

Hello ${agentName},

Your Regional Agent account has been created${locationName ? ` for ${locationName}` : ''}.

Login Email: ${toEmail}
System Password: ${password}
Agent Portal URL: ${loginUrl}

Please access the portal using the link above.

Security Notice: Keep your login credentials confidential.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Agent credentials email sent to ${toEmail}`, info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Failed to send agent credentials email:", error);
    return false;
  }
}

export interface RideReceiptEmailData {
  toEmail: string;
  passengerName?: string;
  invoiceNo: string;
  bookingId: string;
  date?: string | Date;
  completedAt?: string | Date;
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm: number;
  durationMinutes?: number;
  driverName?: string;
  driverPhone?: string;
  vehicleRegNum?: string;
  vehicleType?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  baseFare: number;
  ratePerKm: number;
  distanceFare: number;
  pickupFare?: number;
  waitingMinutes?: number;
  waitingRatePerMin?: number;
  waitingFare?: number;
  totalFare: number;
}

export async function sendRideReceiptEmail(data: RideReceiptEmailData): Promise<boolean> {
  if (!transporter) {
    console.warn("Email not configured - skipping ride receipt email to", data.toEmail);
    return false;
  }

  if (!data.toEmail || !data.toEmail.includes("@")) {
    console.warn("Invalid email address for ride receipt:", data.toEmail);
    return false;
  }

  const pName = data.passengerName || "Valued Rider";
  const invNo = data.invoiceNo || `INV-${String(data.bookingId).substring(0, 8).toUpperCase()}`;
  const total = Number(data.totalFare) || 0;
  const payMethod = (data.paymentMethod || "cash").toUpperCase();
  const dist = Number(data.distanceKm) || 0;
  const base = Number(data.baseFare) || 0;
  const distFare = Number(data.distanceFare) || 0;
  const rateKm = Number(data.ratePerKm) || 0;
  const pickupFare = Number(data.pickupFare) || 0;
  const waitMin = Number(data.waitingMinutes) || 0;
  const waitFare = Number(data.waitingFare) || 0;

  let formattedDate = "";
  try {
    const rawDate = data.completedAt || data.date || new Date();
    formattedDate = new Date(rawDate).toLocaleString("en-US", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  } catch (_) {
    formattedDate = new Date().toLocaleDateString("en-US");
  }

  const waitingRow = waitMin > 0
    ? `<tr>
        <td style="padding: 10px 0; color: #4b5563; border-bottom: 1px solid #f1f5f9;">Waiting Charges (${waitMin} min)</td>
        <td style="padding: 10px 0; text-align: right; color: #1e293b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Rs. ${waitFare.toLocaleString()}</td>
      </tr>`
    : "";

  const pickupRow = pickupFare > 0
    ? `<tr>
        <td style="padding: 10px 0; color: #4b5563; border-bottom: 1px solid #f1f5f9;">Pickup Surcharge</td>
        <td style="padding: 10px 0; text-align: right; color: #1e293b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Rs. ${pickupFare.toLocaleString()}</td>
      </tr>`
    : "";

  const mailOptions = {
    from: env.SMTP_FROM || `Serve Family Taxi <${env.SMTP_USER || "noreply@api.servefamily.com"}>`,
    to: data.toEmail,
    subject: `Your Ride Receipt: Rs. ${total.toLocaleString()} - ${invNo} 🚕`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ride Receipt</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 30px 15px;">
            <tr>
              <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
                  
                  <!-- HEADER BRANDING -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 30px; text-align: center;">
                      <div style="display: inline-block; background-color: #22c55e; color: #ffffff; font-weight: 800; font-size: 13px; letter-spacing: 1px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 12px;">
                        🚕 SERVE FAMILY TAXI
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Thanks for riding with us!</h1>
                      <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">Official Digital Trip Receipt · ${invNo}</p>
                    </td>
                  </tr>

                  <!-- HERO FARE CALLOUT -->
                  <tr>
                    <td style="padding: 28px 30px 20px 30px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                      <p style="margin: 0; color: #64748b; font-size: 14px; font-weight: 500;">Hello <strong>${pName}</strong>, here is your trip total:</p>
                      <div style="font-size: 42px; font-weight: 800; color: #0f172a; margin: 12px 0 10px 0; letter-spacing: -1px;">
                        Rs. ${total.toLocaleString()}
                      </div>
                      <div style="display: inline-block; background-color: #ecfdf5; color: #047857; font-weight: 700; font-size: 13px; padding: 5px 14px; border-radius: 9999px; border: 1px solid #a7f3d0;">
                        ✓ PAID · ${payMethod}
                      </div>
                      <div style="margin-top: 10px; font-size: 12px; color: #94a3b8;">${formattedDate}</div>
                    </td>
                  </tr>

                  <!-- ROUTE TIMELINE CARD -->
                  <tr>
                    <td style="padding: 24px 30px 10px 30px;">
                      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                          <!-- PICKUP -->
                          <tr>
                            <td valign="top" width="28">
                              <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #10b981; border: 3px solid #d1fae5;"></div>
                            </td>
                            <td valign="top" style="padding-bottom: 18px;">
                              <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #10b981; letter-spacing: 0.5px;">Pickup Location</div>
                              <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 2px; line-height: 1.4;">${data.pickupAddress}</div>
                            </td>
                          </tr>
                          <!-- CONNECTOR -->
                          <tr>
                            <td valign="top" style="text-align: center; padding-left: 5px;">
                              <div style="width: 2px; height: 18px; background-color: #cbd5e1; margin-top: -12px; margin-bottom: 4px;"></div>
                            </td>
                            <td valign="top" style="padding-bottom: 8px;">
                              <span style="font-size: 12px; font-weight: 600; color: #64748b; background-color: #ffffff; padding: 2px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
                                ${dist} km completed
                              </span>
                            </td>
                          </tr>
                          <!-- DROPOFF -->
                          <tr>
                            <td valign="top" width="28">
                              <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #ef4444; border: 3px solid #fee2e2;"></div>
                            </td>
                            <td valign="top">
                              <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #ef4444; letter-spacing: 0.5px;">Drop-off Destination</div>
                              <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-top: 2px; line-height: 1.4;">${data.dropoffAddress}</div>
                            </td>
                          </tr>
                        </table>
                      </div>
                    </td>
                  </tr>

                  <!-- DRIVER & VEHICLE INFO -->
                  <tr>
                    <td style="padding: 10px 30px 15px 30px;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px;">
                        <tr>
                          <td valign="middle" style="width: 50%;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Driver</div>
                            <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${data.driverName || "Driver"}</div>
                            ${data.driverPhone ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${data.driverPhone}</div>` : ""}
                          </td>
                          <td valign="middle" style="width: 50%; text-align: right;">
                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Vehicle Details</div>
                            <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${data.vehicleRegNum || "Vehicle"}</div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${data.vehicleType || "Taxi"}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- ITEMIZED BILL BREAKDOWN -->
                  <tr>
                    <td style="padding: 15px 30px 24px 30px;">
                      <div style="font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Fare Breakdown</div>
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px;">
                        <tr>
                          <td style="padding: 10px 0; color: #4b5563; border-bottom: 1px solid #f1f5f9;">Base Fare</td>
                          <td style="padding: 10px 0; text-align: right; color: #1e293b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Rs. ${base.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; color: #4b5563; border-bottom: 1px solid #f1f5f9;">Distance Fare (${dist} km × Rs. ${rateKm}/km)</td>
                          <td style="padding: 10px 0; text-align: right; color: #1e293b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Rs. ${distFare.toLocaleString()}</td>
                        </tr>
                        ${pickupRow}
                        ${waitingRow}
                        <tr>
                          <td style="padding: 14px 0 0 0; color: #0f172a; font-weight: 800; font-size: 16px;">Total Charged</td>
                          <td style="padding: 14px 0 0 0; text-align: right; color: #059669; font-weight: 800; font-size: 18px;">Rs. ${total.toLocaleString()}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- RATING & FEEDBACK CALLOUT -->
                  <tr>
                    <td style="padding: 0 30px 24px 30px;">
                      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; text-align: center;">
                        <div style="font-size: 20px; margin-bottom: 4px;">⭐⭐⭐⭐⭐</div>
                        <div style="font-size: 14px; font-weight: 700; color: #166534;">How was your journey?</div>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #15803d; line-height: 1.4;">
                          Open the Serve Family app to rate your driver and share your experience with our community.
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- CUSTOMER SUPPORT & FOOTER -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0; font-size: 12px; color: #64748b;">
                        Questions or issues regarding this ride? Contact 24/7 Support at <a href="mailto:support@servefamily.com" style="color: #0284c7; text-decoration: none; font-weight: 600;">support@servefamily.com</a>
                      </p>
                      <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
                        Booking ID: ${data.bookingId} · Generated on ${formattedDate}
                      </p>
                      <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
                        © ${new Date().getFullYear()} Serve Family (Life360 Platform). All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `
Serve Family Taxi - Trip Receipt
========================================
Invoice: ${invNo}
Date: ${formattedDate}
Passenger: ${pName}

TRIP SUMMARY
----------------------------------------
Pickup: ${data.pickupAddress}
Drop-off: ${data.dropoffAddress}
Distance: ${dist} km
Driver: ${data.driverName || "Driver"} (${data.vehicleRegNum || "Vehicle"})

FARE BREAKDOWN
----------------------------------------
Base Fare: Rs. ${base}
Distance Fare: Rs. ${distFare}
${pickupFare > 0 ? `Pickup Fee: Rs. ${pickupFare}\n` : ""}${waitMin > 0 ? `Waiting Fee: Rs. ${waitFare} (${waitMin} min)\n` : ""}----------------------------------------
TOTAL: Rs. ${total} (${payMethod} - PAID)

Thank you for riding with Serve Family!
Need help? Contact support@servefamily.com
Booking ID: ${data.bookingId}
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Ride receipt email sent to ${data.toEmail} (${invNo}): ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send ride receipt email:", error);
    return false;
  }
}


