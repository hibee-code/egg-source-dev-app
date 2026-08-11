const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const ApiError = require("../utils/ApiError");
const emailService = require("./email.service");
const env = require("../config/env");
const auditLogService = require("./auditLog.service");
const logger = require("../utils/logger");

/**
 * Generate a signed JWT access token.
 * @param {string} id - User ID
 * @param {string} role - User Role
 * @returns {string}
 */
const getPermissionsForRole = (role) => {
  const mapping = {
    SUPER_ADMIN: ["*"],
    FARM_OWNER: [
      "poultry:read",
      "poultry:write",
      "inventory:read",
      "inventory:write",
      "booking:read",
      "booking:manage",
    ],
    CUSTOMER: ["poultry:read", "inventory:read", "booking:create", "booking:read"],
  };
  return mapping[role] || [];
};

const generateAccessToken = (id, role) => {
  return jwt.sign({ id, role, permissions: getPermissionsForRole(role) }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

/**
 * Generate a signed JWT refresh token.
 * @param {string} id - User ID
 * @returns {string}
 */
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
};

/**
 * Set the refresh token as an httpOnly cookie on the response.
 * @param {import('express').Response} res
 * @param {string} token
 */
const setRefreshCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  };
  res.cookie("refreshToken", token, cookieOptions);
};

/**
 * Clear the refresh token cookie.
 * @param {import('express').Response} res
 */
const clearRefreshCookie = (res) => {
  res.cookie("refreshToken", "", {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
};

// ═══════════════════════════════════════════════════════════
//  AUTH SERVICE
// ═══════════════════════════════════════════════════════════

class AuthService {
  /**
   * Register a new user.
   * @param {Object} data - { firstName, lastName, email, password, role?, phone? }
   * @returns {{ user }}
   */
  async register(data, res) {
    // Check for existing user
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      // ── OTP SUPPRESSED: Previously handled unverified re-registration with OTP resend.
      // ── Since isVerified is now always true on creation, all existing users are verified.
      // ── TODO: Restore the unverified branch below when OTP is re-enabled.
      // if (!existingUser.isVerified) { ... }

      throw ApiError.conflict("An account with this email already exists");
    }

    const allowedRoles = ["CUSTOMER", "FARM_OWNER"];
    const assignedRole = (data.role && allowedRoles.includes(data.role)) ? data.role : "CUSTOMER";

    // Create user (password hashed by pre-save hook)
    const userPayload = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      role: assignedRole,
      phone: data.phone || "",
      // ── OTP SUPPRESSED: Auto-verify users until Resend email integration is fixed.
      // ── TODO: Set back to `false` and re-enable OTP block below once Resend is live.
      isVerified: true,
    };

    // Save signup geolocation if provided by the browser
    if (typeof data.latitude === "number" && typeof data.longitude === "number") {
      const geoPoint = {
        type: "Point",
        coordinates: [data.longitude, data.latitude],
      };
      userPayload.lastLoginLocation = geoPoint;
      userPayload.signupLocation = geoPoint; // Permanent signup location for map display
    }

    const user = await User.create(userPayload);

    // ── OTP BLOCK SUPPRESSED — uncomment when Resend API key is live ──────────
    // const otpCode = user.createOTP();
    // await user.save({ validateBeforeSave: false });
    // logger.info(`🔑 [OTP GENERATED for ${user.email}]: ${otpCode}`);
    // try {
    //   await emailService.sendOTPEmail(user.email, user.firstName, otpCode);
    // } catch (emailErr) {
    //   logger.warn(`OTP email dispatch warning: ${emailErr.message}`);
    // }
    // ── END OTP BLOCK ─────────────────────────────────────────────────────────

    logger.info(`✅ [USER REGISTERED - AUTO-VERIFIED]: ${user.email} | Role: ${user.role}`);

    // ── OTP SUPPRESSED: Issue login tokens immediately upon registration.
    // ── TODO: Remove this token block when OTP is re-enabled (token should only issue after OTP verify).
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    user.refreshTokenHash = tokenHash;
    await user.save({ validateBeforeSave: false });
    setRefreshCookie(res, refreshToken);
    // ── END SUPPRESSED TOKEN BLOCK ─────────────────────────────────────────────

    return { user, email: user.email, accessToken };
  }

  /**
   * Log in an existing user.
   * @param {string} email
   * @param {string} password
   * @param {import('express').Response} res
   * @param {string} ipAddress
   * @param {string} userAgent
   * @returns {{ user, accessToken }}
   */
  async login(email, password, res, ipAddress = "", userAgent = "", latitude = null, longitude = null) {
    // Find user with password included
    const user = await User.findOne({ email }).select("+password +refreshTokenHash");
    if (!user) {
      await auditLogService.log(null, "USER_LOGIN_FAILED", ipAddress, userAgent, { email, reason: "User not found" }, "WARNING");
      throw ApiError.unauthorized("Invalid email or password");
    }

    // Check lockout status
    if (user.lockoutUntil && user.lockoutUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockoutUntil - Date.now()) / (60 * 1000));
      await auditLogService.log(user._id, "USER_LOGIN_LOCKED", ipAddress, userAgent, { email }, "WARNING");
      throw ApiError.forbidden(`Your account is temporarily locked. Try again in ${minutesLeft} minutes.`);
    }

    // Check if account is active
    if (!user.isActive) {
      await auditLogService.log(user._id, "USER_LOGIN_INACTIVE", ipAddress, userAgent, { email }, "WARNING");
      throw ApiError.forbidden("Your account has been deactivated. Contact support.");
    }

    // ── OTP SUPPRESSED: isVerified check bypassed until Resend integration is fixed.
    // ── TODO: Uncomment the block below when OTP email flow is re-enabled.
    // if (!user.isVerified) {
    //   await auditLogService.log(user._id, "USER_LOGIN_UNVERIFIED", ipAddress, userAgent, { email }, "WARNING");
    //   throw ApiError.forbidden("Please verify your email address to log in.");
    // }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment failed login attempts
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
        user.failedLoginAttempts = 0; // Reset counter
        await user.save({ validateBeforeSave: false });
        await auditLogService.log(user._id, "USER_ACCOUNT_LOCKED", ipAddress, userAgent, { email, reason: "5 failed attempts" }, "CRITICAL");
        throw ApiError.forbidden("Account locked due to too many failed login attempts. Please try again in 15 minutes.");
      }
      await user.save({ validateBeforeSave: false });
      await auditLogService.log(user._id, "USER_LOGIN_FAILED", ipAddress, userAgent, { email, reason: "Incorrect password" }, "WARNING");
      throw ApiError.unauthorized("Invalid email or password");
    }

    // Reset failed login attempts
    user.failedLoginAttempts = 0;
    user.lockoutUntil = undefined;

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token hash
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    user.refreshTokenHash = tokenHash;

    // Update location for non-SUPER_ADMIN users if coordinates are provided
    if (user.role !== "SUPER_ADMIN" && typeof latitude === "number" && typeof longitude === "number") {
      user.lastLoginLocation = {
        type: "Point",
        coordinates: [longitude, latitude],
      };
    }

    await user.save({ validateBeforeSave: false });

    // Set refresh token cookie
    setRefreshCookie(res, refreshToken);

    // Audit Log success
    await auditLogService.log(user._id, "USER_LOGIN_SUCCESS", ipAddress, userAgent, { email, role: user.role });

    return { user, accessToken };
  }

  /**
   * Log out — clear the refresh token from DB and cookie.
   * @param {string} userId
   * @param {import('express').Response} res
   * @param {string} ipAddress
   * @param {string} userAgent
   */
  async logout(userId, res, ipAddress = "", userAgent = "") {
    await User.findByIdAndUpdate(userId, { refreshTokenHash: "" });
    clearRefreshCookie(res);
    await auditLogService.log(userId, "USER_LOGOUT", ipAddress, userAgent);
  }

  /**
   * Refresh the access token using the refresh token from the cookie.
   * @param {string} token - Refresh token from cookie
   * @param {import('express').Response} res
   * @param {string} ipAddress
   * @param {string} userAgent
   * @returns {{ accessToken }}
   */
  async refreshAccessToken(token, res, ipAddress = "", userAgent = "") {
    if (!token) {
      throw ApiError.unauthorized("No refresh token provided");
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    // Find user and select refresh token hashes & timestamp
    const user = await User.findById(decoded.id).select(
      "+refreshTokenHash +previousRefreshTokenHash +refreshTokenRotatedAt"
    );
    if (!user) {
      throw ApiError.unauthorized("Invalid refresh token");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const REFRESH_GRACE_PERIOD_MS = 30 * 1000; // 30 seconds

    const isCurrentToken = user.refreshTokenHash === tokenHash;
    const isPreviousTokenInGracePeriod =
      user.previousRefreshTokenHash === tokenHash &&
      user.refreshTokenRotatedAt &&
      Date.now() - new Date(user.refreshTokenRotatedAt).getTime() < REFRESH_GRACE_PERIOD_MS;

    if (!isCurrentToken && !isPreviousTokenInGracePeriod) {
      throw ApiError.unauthorized("Invalid or re-used refresh token");
    }

    const accessToken = generateAccessToken(user._id, user.role);

    // If request matched previous token within grace window, reuse active session without re-rotating
    if (isPreviousTokenInGracePeriod) {
      logger.info(`ℹ️ [AUTH REFRESH GRACE PERIOD]: Allowed concurrent refresh for user ${user._id}`);
      return { accessToken };
    }

    // Issue new tokens (rotate refresh token for security)
    const newRefreshToken = generateRefreshToken(user._id);
    const newHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

    user.previousRefreshTokenHash = user.refreshTokenHash;
    user.refreshTokenHash = newHash;
    user.refreshTokenRotatedAt = new Date();
    await user.save({ validateBeforeSave: false });

    setRefreshCookie(res, newRefreshToken);

    return { accessToken };
  }

  /**
   * Forgot password — generate a reset token and "send" it via email.
   * @param {string} email
   */
  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether the email exists
      return;
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Build reset URL (frontend would consume this)
    const resetURL = `${env.CORS_ORIGIN}/reset-password/${resetToken}`;

    await emailService.sendPasswordResetEmail(user.email, user.firstName, resetURL);
  }

  /**
   * Reset password using the token from the email link.
   * @param {string} token - Plain-text reset token from URL
   * @param {string} newPassword
   */
  async resetPassword(token, newPassword) {
    // Hash the token to compare with DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      throw ApiError.badRequest("Token is invalid or has expired");
    }

    // Set new password (hashed by pre-save hook)
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = ""; // Invalidate all sessions
    await user.save();
  }

  /**
   * Change password for an authenticated user.
   * @param {string} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw ApiError.unauthorized("Current password is incorrect");
    }

    // Update password (hashed by pre-save hook)
    user.password = newPassword;
    user.refreshToken = ""; // Invalidate sessions on password change
    await user.save();
  }

  /**
   * Get user profile.
   * @param {string} userId
   * @returns {Object} User document
   */
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    return user;
  }

  /**
   * Update user profile (allowed fields only).
   * @param {string} userId
   * @param {Object} data - { firstName?, lastName?, phone?, avatar?, address? }
   * @returns {Object} Updated user document
   */
  async updateProfile(userId, data) {
    // Only allow specific fields to be updated
    const allowedFields = ["firstName", "lastName", "phone", "avatar", "address"];
    const updateData = {};

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    return user;
  }

  /**
   * Verify a user's email using the token.
   * @param {string} token - The plain text verification token
   */
  async verifyEmail(token) {
    // Hash the token to compare with DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw ApiError.badRequest("Verification token is invalid or has expired");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });
  }

  /**
   * Resend the email verification link to a user.
   * @param {string} email
   */
  async resendVerificationEmail(email) {
    const user = await User.findOne({ email });
    if (!user) {
      // Return early/silent success to avoid email enumeration
      return;
    }

    if (user.isVerified) {
      throw ApiError.badRequest("This email is already verified");
    }

    // Generate verification token
    const verificationToken = user.createVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send verification email
    const verificationURL = `${env.CORS_ORIGIN}/verify-email/${verificationToken}`;
    await emailService.sendVerificationEmail(user.email, user.firstName, verificationURL);
  }

  /**
   * Verify user using 6-digit OTP code and issue access token upon success.
   */
  async verifyOTP(email, otp, res, ipAddress = "", userAgent = "") {
    const user = await User.findOne({ email }).select("+otpCode +otpExpires");
    if (!user) {
      throw ApiError.badRequest("Invalid email or verification code");
    }

    if (user.isVerified) {
      const accessToken = generateAccessToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id);
      const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
      user.refreshTokenHash = tokenHash;
      await user.save({ validateBeforeSave: false });
      setRefreshCookie(res, refreshToken);
      return { user, accessToken };
    }

    if (!user.otpCode || !user.otpExpires || user.otpExpires < Date.now()) {
      throw ApiError.badRequest("Verification code has expired. Please request a new code.");
    }

    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
    if (hashedOTP !== user.otpCode) {
      throw ApiError.badRequest("Incorrect 6-digit verification code");
    }

    // Mark user verified and clear OTP fields
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;

    // Issue login tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    user.refreshTokenHash = tokenHash;

    await user.save({ validateBeforeSave: false });
    setRefreshCookie(res, refreshToken);

    await auditLogService.log(user._id, "USER_OTP_VERIFIED", ipAddress, userAgent, { email, role: user.role });

    return { user, accessToken };
  }

  /**
   * Resend a fresh 6-digit OTP code to user.
   */
  async resendOTP(email) {
    const user = await User.findOne({ email });
    if (!user) {
      // Silent return to avoid enumeration
      return;
    }

    if (user.isVerified) {
      throw ApiError.badRequest("This email is already verified. You can sign in directly.");
    }

    const otpCode = user.createOTP();
    await user.save({ validateBeforeSave: false });
    logger.info(`🔑 [OTP RESENT for ${user.email}]: ${otpCode}`);

    try {
      await emailService.sendOTPEmail(user.email, user.firstName, otpCode);
    } catch (emailErr) {
      logger.warn(`Resend OTP email dispatch warning: ${emailErr.message}`);
    }
    return { email: user.email, otpCode };
  }
}

module.exports = new AuthService();
