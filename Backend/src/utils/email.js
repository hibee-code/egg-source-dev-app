const logger = require("./logger");

/**
 * Placeholder email utility.
 * Logs the email details to the console in development.
 * Replace the body of this function with a real provider
 * (SendGrid, Mailgun, Nodemailer, etc.) when ready.
 *
 * @param {Object} options
 * @param {string} options.to      - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text    - Plain text body
 */
const sendEmail = async ({ to, subject, text }) => {
  // ── Placeholder: log instead of sending ──
  logger.info("──────────────── EMAIL ────────────────");
  logger.info(`To:      ${to}`);
  logger.info(`Subject: ${subject}`);
  logger.info(`Body:    ${text}`);
  logger.info("───────────────────────────────────────");

  // TODO: Replace with real email transport, e.g.:
  // const transporter = nodemailer.createTransport({ ... });
  // await transporter.sendMail({ from: ..., to, subject, text });
};

module.exports = sendEmail;
