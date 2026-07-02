const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/ApiResponse");
const authService = require("../services/auth.service");
const env = require("../config/env");

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = catchAsync(async (req, res) => {
  const { user } = await authService.register(req.body);
  const response = { user };

  if (env.isDevelopment) {
    // Auto-verify user in dev mode so the login check passes
    const User = require("../models/user.model");
    await User.findByIdAndUpdate(user._id, { isVerified: true });

    try {
      const loginResult = await authService.login(req.body.email, req.body.password, res);
      if (loginResult.accessToken) {
        response.accessToken = loginResult.accessToken;
      }
    } catch (err) {
      // If auto-login fails for any reason in dev, still return the user
      console.warn("Dev auto-login failed:", err.message);
    }
  }

  sendSuccess(res, 201, "Registration successful", response);
});

/**
 * @desc    Log in an existing user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken } = await authService.login(email, password, res);

  sendSuccess(res, 200, "Login successful", {
    user,
    accessToken,
  });
});

/**
 * @desc    Log out — clear refresh token
 * @route   POST /api/v1/auth/logout
 * @access  Protected
 */
const logout = catchAsync(async (req, res) => {
  await authService.logout(req.user._id, res);

  sendSuccess(res, 200, "Logged out successfully");
});

/**
 * @desc    Refresh access token using refresh cookie
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public (requires valid refresh cookie)
 */
const refreshToken = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;
  const { accessToken } = await authService.refreshAccessToken(token, res);

  sendSuccess(res, 200, "Token refreshed", { accessToken });
});

/**
 * @desc    Request a password reset email
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
const forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body.email);

  // Always return success to avoid email enumeration
  sendSuccess(
    res,
    200,
    "If an account with that email exists, a password reset link has been sent."
  );
});

/**
 * @desc    Reset password using reset token
 * @route   PATCH /api/v1/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.params.token, req.body.password);

  sendSuccess(res, 200, "Password reset successful. Please log in with your new password.");
});

/**
 * @desc    Change password (authenticated)
 * @route   PATCH /api/v1/auth/change-password
 * @access  Protected
 */
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user._id, currentPassword, newPassword);

  sendSuccess(res, 200, "Password changed successfully");
});

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/profile
 * @access  Protected
 */
const getProfile = catchAsync(async (req, res) => {
  const user = await authService.getProfile(req.user._id);

  sendSuccess(res, 200, "Profile retrieved", { user });
});

/**
 * @desc    Update current user profile
 * @route   PATCH /api/v1/auth/profile
 * @access  Protected
 */
const updateProfile = catchAsync(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);

  sendSuccess(res, 200, "Profile updated", { user });
});

/**
 * @desc    Verify user email using verification token
 * @route   GET /api/v1/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.params.token);

  sendSuccess(res, 200, "Email verified successfully. You can now log in.");
});

/**
 * @desc    Resend email verification link
 * @route   POST /api/v1/auth/resend-verification
 * @access  Public
 */
const resendVerification = catchAsync(async (req, res) => {
  await authService.resendVerificationEmail(req.body.email);

  sendSuccess(
    res,
    200,
    "If an account with that email exists and is not verified, a new verification link has been sent."
  );
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  verifyEmail,
  resendVerification,
};
