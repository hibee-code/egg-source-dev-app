const ApiError = require("../utils/ApiError");

/**
 * Creates a validation middleware for the given Joi schema.
 * Validates req.body by default. Strips unknown fields.
 *
 * @param {import('joi').ObjectSchema} schema - Joi schema to validate against
 * @returns {Function} Express middleware
 */
const validate = (schema, source = "body") => {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false, // Report all errors, not just the first
      stripUnknown: true, // Remove fields not in the schema
    });

    if (error) {
      const messages = error.details.map((detail) => detail.message).join("; ");
      return next(ApiError.badRequest(messages));
    }

    // Replace request field with the validated + sanitised value
    req[source] = value;
    next();
  };
};

module.exports = validate;
