const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const ApiError = require("../utils/ApiError");
const emailService = require("./email.service");
const env = require("../config/env");
const auditLogService = require("./auditLog.service");

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
      "product:read",
      "product:write",
      "booking:read",
      "booking:write:fulfillment",
    ],
    CUSTOMER: [
      "poultry:read",
      "product:read",
      "booking:read:own",
      "booking:write:own",
    ],
  };
  return mapping[role] || [];
};

const generateAccessToken = (id, role) => {
  const permissions = getPermissionsForRole(role);
  return jwt.sign({ id, role, permissions }, env.JWT_SECRET, {
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
  async register(data) {
    // Check for existing user
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw ApiError.conflict("An account with this email already exists");
    }

    // Create user (password hashed by pre-save hook)
    const userPayload = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      role: "CUSTOMER", // Unified self-registration role is CUSTOMER
      phone: data.phone || "",
    };

    if (typeof data.latitude === "number" && typeof data.longitude === "number") {
      userPayload.lastLoginLocation = {
        type: "Point",
        coordinates: [data.longitude, data.latitude],
      };
    }

    const user = await User.create(userPayload);

    // Generate verification token
    const verificationToken = user.createVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send verification email
    const verificationURL = `${env.CORS_ORIGIN}/verify-email/${verificationToken}`;
    await emailService.sendVerificationEmail(user.email, user.firstName, verificationURL);

    return { user };
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

    // Check if email is verified
    if (!user.isVerified) {
      await auditLogService.log(user._id, "USER_LOGIN_UNVERIFIED", ipAddress, userAgent, { email }, "WARNING");
      throw ApiError.forbidden("Please verify your email address to log in.");
    }

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

    // Find user and check that the stored token matches
    const user = await User.findById(decoded.id).select("+refreshTokenHash");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (!user || user.refreshTokenHash !== tokenHash) {
      throw ApiError.unauthorized("Invalid refresh token");
    }

    // Issue new tokens (rotate refresh token for security)
    const accessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);
    const newHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

    user.refreshTokenHash = newHash;
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
}

module.exports = new AuthService();
