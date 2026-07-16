const { Resend } = require("resend");
const env = require("../config/env");
const logger = require("../utils/logger");

class EmailService {
  constructor() {
    this.resend = null;
    this.fromEmail = env.RESEND_FROM_EMAIL;

    // Initialize Resend if API key is provided and is not a placeholder
    const hasKey = env.RESEND_API_KEY && env.RESEND_API_KEY !== "re_placeholder";
    if (hasKey) {
      this.resend = new Resend(env.RESEND_API_KEY);
      logger.info("📧 EmailService: Resend SDK initialized successfully.");
    } else {
      logger.warn("⚠️  EmailService: No RESEND_API_KEY found. Falling back to development console logging mode.");
    }
  }

  /**
   * General template wrapper for standardizing visual branding.
   * Uses Egg Source green accents (#1f4d0a) and slate colors.
   */
  _getHtmlLayout(title, contentHtml) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .wrapper {
            width: 100%;
            background-color: #f8fafc;
            padding: 40px 0;
          }
          .container {
            max-width: 580px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          }
          .header {
            background-color: #1f4d0a;
            padding: 30px;
            text-align: center;
          }
          .logo-text {
            color: #ffffff;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.025em;
            margin: 0;
          }
          .logo-text span {
            color: #a3e635;
          }
          .content {
            padding: 40px 30px;
            line-height: 1.6;
            font-size: 16px;
            color: #334155;
          }
          h1 {
            font-size: 20px;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 20px;
            color: #0f172a;
          }
          .btn-container {
            margin: 32px 0;
            text-align: center;
          }
          .btn {
            display: inline-block;
            background-color: #1f4d0a;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            text-align: center;
            box-shadow: 0 4px 6px -1px rgba(31, 77, 10, 0.2);
          }
          .footer {
            background-color: #f1f5f9;
            padding: 24px 30px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
          }
          .footer a {
            color: #1f4d0a;
            text-decoration: underline;
          }
          .notice {
            margin-top: 24px;
            padding: 12px;
            background-color: #f8fafc;
            border-left: 4px solid #cbd5e1;
            font-size: 13px;
            color: #475569;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="logo-text">ES <span>Egg Source</span></div>
            </div>
            <div class="content">
              ${contentHtml}
            </div>
            <div class="footer">
              <p>This is an automated system notification from Egg Source.</p>
              <p>&copy; ${new Date().getFullYear()} Egg Source Dev Platform. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Internal dispatcher that calls Resend API or logs to console.
   */
  async _send({ to, subject, html, text }) {
    if (this.resend) {
      try {
        const response = await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject,
          html,
          text,
        });

        if (response.error) {
          logger.error(`❌ Resend API Error: ${response.error.message} (${response.error.name})`);
          throw new Error(response.error.message);
        }

        logger.info(`📧 Email successfully sent via Resend to: ${to} (ID: ${response.data.id})`);
        return response.data;
      } catch (err) {
        logger.error(`❌ Failed to send email via Resend to ${to}: ${err.message}`);
        throw err;
      }
    } else {
      // Development console logging fallback
      logger.info("┌────────────────── DEVELOPMENT EMAIL SIMULATION ──────────────────┐");
      logger.info(`│ TO:      ${to}`);
      logger.info(`│ SUBJECT: ${subject}`);
      logger.info("├──────────────────────────────────────────────────────────────────┤");
      logger.info(`│ PLAIN TEXT BODY:\n│\n${text.split("\n").map(line => `│ ${line}`).join("\n")}`);
      logger.info("└──────────────────────────────────────────────────────────────────┘");
      return { id: `dev_sim_${Date.now()}` };
    }
  }

  /**
   * Send onboarding invitation to poultry farm owners.
   */
  async sendFarmOwnerInvitation(to, businessName, inviteLink, isResend = false) {
    const subject = isResend
      ? `Egg Source — Invited to join as Farm Owner (Resent)`
      : `Egg Source — Invited to join as Farm Owner`;

    const title = isResend ? "Invitation Resent" : "Invitation to Join Egg Source";

    const contentHtml = `
      <h1>Hello,</h1>
      <p>You have been invited to register your poultry farm <strong>"${businessName}"</strong> on the <strong>Egg Source</strong> marketplace as a Farm Owner.</p>
      <p>By onboarding, you will gain access to direct buyer transactions, order requests, and inventory tracking tools.</p>
      <p>Please click the button below to complete your registration and activate your seller account:</p>
      <div class="btn-container">
        <a href="${inviteLink}" target="_blank" class="btn">Register as Farm Owner</a>
      </div>
      <div class="notice">
        <strong>Important:</strong> This secure registration link is single-use and will expire in 24 hours. If you did not expect this request, please contact support.
      </div>
      <p style="margin-top: 24px; font-size: 13px; color: #64748b; word-break: break-all;">
        If the button does not work, copy and paste this URL into your browser:<br>
        <a href="${inviteLink}" target="_blank">${inviteLink}</a>
      </p>
    `;

    const text = `Hi there,

You have been invited to register your farm "${businessName}" on Egg Source as a Farm Owner.

Please click the link below to complete your registration and activate your account:
${inviteLink}

This invitation link is single-use and will expire in 24 hours.

Best regards,
Egg Source Team`;

    return this._send({
      to,
      subject,
      html: this._getHtmlLayout(title, contentHtml),
      text,
    });
  }

  /**
   * Send verification email to customers and partners.
   */
  async sendVerificationEmail(to, name, verificationLink) {
    const subject = "Egg Source — Verify Your Email Address";
    const title = "Verify Your Email";

    const contentHtml = `
      <h1>Hi ${name},</h1>
      <p>Thank you for signing up on <strong>Egg Source</strong>! We are excited to have you join our digital egg-sourcing marketplace.</p>
      <p>To confirm your email address and activate your account, please click the verification button below:</p>
      <div class="btn-container">
        <a href="${verificationLink}" target="_blank" class="btn">Verify Email Address</a>
      </div>
      <div class="notice">
        This verification link will expire in 24 hours.
      </div>
      <p style="margin-top: 24px; font-size: 13px; color: #64748b; word-break: break-all;">
        If the button does not work, copy and paste this URL into your browser:<br>
        <a href="${verificationLink}" target="_blank">${verificationLink}</a>
      </p>
    `;

    const text = `Hi ${name},

Welcome to Egg Source! Please verify your email by clicking the link below:

${verificationLink}

This link will expire in 24 hours.

Best regards,
Egg Source Team`;

    return this._send({
      to,
      subject,
      html: this._getHtmlLayout(title, contentHtml),
      text,
    });
  }

  /**
   * Send password reset verification links.
   */
  async sendPasswordResetEmail(to, name, resetLink) {
    const subject = "Egg Source — Password Reset Request";
    const title = "Password Reset Request";

    const contentHtml = `
      <h1>Hi ${name},</h1>
      <p>We received a request to reset the password for your <strong>Egg Source</strong> account.</p>
      <p>To set a new password, click the button below:</p>
      <div class="btn-container">
        <a href="${resetLink}" target="_blank" class="btn">Reset Password</a>
      </div>
      <div class="notice">
        <strong>Notice:</strong> This password reset link is only valid for 10 minutes. If you did not request a password reset, you can safely ignore this email; your password will remain unchanged.
      </div>
      <p style="margin-top: 24px; font-size: 13px; color: #64748b; word-break: break-all;">
        If the button does not work, copy and paste this URL into your browser:<br>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
      </p>
    `;

    const text = `Hi ${name},

You requested a password reset. Use the link below to set a new password:

${resetLink}

This link is valid for 10 minutes. If you didn't request this, please ignore this email.

Best regards,
Egg Source Team`;

    return this._send({
      to,
      subject,
      html: this._getHtmlLayout(title, contentHtml),
      text,
    });
  }
}

module.exports = new EmailService();
