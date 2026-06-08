const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { ALL_ROLES, ROLES } = require("../constants/roles");

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never returned in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ALL_ROLES,
        message: "Role must be one of: " + ALL_ROLES.join(", "),
      },
      default: ROLES.CUSTOMER,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },

    // ── Auth tokens (never returned in queries) ──
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      // Remove sensitive fields when converting to JSON
      transform(_doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.verificationToken;
        delete ret.verificationTokenExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ──────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// ── Pre-save: hash password ─────────────────────────────
const SALT_ROUNDS = 12;

userSchema.pre("save", async function () {
  // Only hash when password field has been modified
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

// ── Instance Methods ─────────────────────────────────────

/**
 * Compare a candidate password against the hashed password.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Generate a password-reset token (unhashed) and store the
 * hashed version + expiry on the user document.
 * @returns {string} The plain-text reset token (to send to the user)
 */
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Store hashed version in DB
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Token valid for 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

/**
 * Generate a verification token (unhashed) and store the
 * hashed version + expiry on the user document.
 * @returns {string} The plain-text verification token (to send to the user)
 */
userSchema.methods.createVerificationToken = function () {
  const token = crypto.randomBytes(32).toString("hex");

  // Store hashed version in DB
  this.verificationToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // Token valid for 24 hours
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

  return token;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
