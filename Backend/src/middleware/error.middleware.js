const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");

/**
 * Handle Mongoose CastError (invalid ObjectId, etc.)
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return ApiError.badRequest(message);
};

/**
 * Handle Mongoose duplicate key error (code 11000).
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const message = `Duplicate value for "${field}". This ${field} is already in use.`;
  return ApiError.conflict(message);
};

/**
 * Handle Mongoose validation errors.
 */
const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  const message = `Validation failed: ${messages.join("; ")}`;
  return ApiError.badRequest(message);
};

/**
 * Handle JWT errors.
 */
const handleJWTError = () =>
  ApiError.unauthorized("Invalid token. Please log in again.");

const handleJWTExpiredError = () =>
  ApiError.unauthorized("Your token has expired. Please log in again.");

/**
 * Global error-handling middleware.
 * Must have 4 parameters for Express to recognise it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, _req, res, _next) => {
  // Default values
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Clone the error so we don't mutate the original
  let error = { ...err, message: err.message, name: err.name };

  // ── Transform known error types ──
  if (error.name === "CastError") error = handleCastError(error);
  if (error.code === 11000) error = handleDuplicateKeyError(error);
  if (error.name === "ValidationError") error = handleValidationError(error);
  if (error.name === "JsonWebTokenError") error = handleJWTError();
  if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

  // ── Log the error ──
  if (error.statusCode >= 500) {
    logger.error(`${error.statusCode} - ${error.message}`, {
      stack: err.stack,
    });
  } else {
    logger.warn(`${error.statusCode} - ${error.message}`);
  }

  // ── Send response ──
  const response = {
    success: false,
    status: error.status,
    message: error.message,
  };

  // Include stack trace in development only
  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  res.status(error.statusCode).json(response);
};

module.exports = errorMiddleware;
