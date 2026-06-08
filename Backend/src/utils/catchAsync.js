/**
 * Wraps an async Express route handler to automatically catch
 * rejected promises and forward them to the error middleware.
 *
 * @param {Function} fn - Async route handler (req, res, next)
 * @returns {Function}  - Wrapped handler
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
