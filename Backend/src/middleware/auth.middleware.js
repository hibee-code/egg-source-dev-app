const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const env = require("../config/env");

/**
 * Protect routes — verifies the JWT access token from the
 * Authorization header and attaches the user to req.user.
 */
const protect = catchAsync(async (req, _res, next) => {
  // 1) Extract token from header
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return next(
      ApiError.unauthorized("You are not logged in. Please log in to get access.")
    );
  }

  // 2) Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(ApiError.unauthorized("Your token has expired. Please log in again."));
    }
    return next(ApiError.unauthorized("Invalid token. Please log in again."));
  }

  // 3) Check if user still exists
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(
      ApiError.unauthorized("The user belonging to this token no longer exists.")
    );
  }

  // 4) Check if user is active
  if (!user.isActive) {
    return next(
      ApiError.forbidden("Your account has been deactivated. Contact support.")
    );
  }

  // 5) Attach user to request
  req.user = user;
  next();
});

/**
 * Role-based access control.
 * Usage: restrictTo(ROLES.ADMIN, ROLES.FARM_OWNER)
 *
 * @param  {...string} roles - Allowed roles
 * @returns {Function} Express middleware
 */
const restrictTo = (...roles) => {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden("You do not have permission to perform this action.")
      );
    }
    next();
  };
};

module.exports = { protect, restrictTo };
