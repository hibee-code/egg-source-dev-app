const dotenv = require("dotenv");
const path = require("path");

const fs = require("fs");

// Load .env from Backend/src/.env or Backend/.env fallback
let envPath = path.resolve(__dirname, "../.env");
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(__dirname, "../../.env");
}
dotenv.config({ path: envPath });

const REQUIRED_VARS = [
  "MONGODB_URI",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "JWT_REFRESH_EXPIRES_IN",
];

// Fail fast if any required env var is missing
const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `Missing required environment variables:\n   ${missing.join(", ")}\n` +
    `   Copy .env.example to .env and fill in the values.`
  );
  process.exit(1);
}

const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV,
  PORT: parseInt(process.env.PORT, 10),
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  INITIAL_ADMIN_EMAIL: process.env.INITIAL_ADMIN_EMAIL,
  INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM,
  isDevelopment: (process.env.NODE_ENV || "development") === "development",
  isProduction: process.env.NODE_ENV === "production",
});

module.exports = env;
