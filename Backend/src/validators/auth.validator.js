const Joi = require("joi");
const { ALL_ROLES } = require("../constants/roles");

// ── Reusable field definitions ───────────────────────────
const password = Joi.string()
  .min(8)
  .max(128)
  .pattern(/(?=.*[a-z])/, "lowercase letter")
  .pattern(/(?=.*[A-Z])/, "uppercase letter")
  .pattern(/(?=.*\d)/, "digit")
  .messages({
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password cannot exceed 128 characters",
    "string.pattern.name":
      "Password must contain at least one {#name}",
  });

const email = Joi.string().email().lowercase().trim().required().messages({
  "string.email": "Please provide a valid email address",
  "any.required": "Email is required",
});

// ── Schemas ──────────────────────────────────────────────

const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50).required().messages({
    "any.required": "First name is required",
    "string.max": "First name cannot exceed 50 characters",
  }),
  lastName: Joi.string().trim().min(1).max(50).required().messages({
    "any.required": "Last name is required",
    "string.max": "Last name cannot exceed 50 characters",
  }),
  email,
  phone: Joi.string().trim().allow("").optional(),
  password: password.required().messages({
    "any.required": "Password is required",
  }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Please confirm your password",
    }),
  role: Joi.string()
    .valid(...ALL_ROLES)
    .optional()
    .messages({
      "any.only": `Role must be one of: ${ALL_ROLES.join(", ")}`,
    }),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
});

const loginSchema = Joi.object({
  email,
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
});

const forgotPasswordSchema = Joi.object({
  email,
});

const resetPasswordSchema = Joi.object({
  password: password.required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Please confirm your password",
    }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Current password is required",
  }),
  newPassword: password.required().messages({
    "any.required": "New password is required",
  }),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
      "any.required": "Please confirm your new password",
    }),
});

const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50).optional(),
  lastName: Joi.string().trim().min(1).max(50).optional(),
  phone: Joi.string().trim().allow("").optional(),
  avatar: Joi.string().uri().allow("").optional(),
  address: Joi.object({
    street: Joi.string().trim().allow("").optional(),
    city: Joi.string().trim().allow("").optional(),
    state: Joi.string().trim().allow("").optional(),
    country: Joi.string().trim().allow("").optional(),
  }).optional(),
}).min(1) // At least one field must be provided
  .messages({
    "object.min": "Please provide at least one field to update",
  });

const resendVerificationSchema = Joi.object({
  email,
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  resendVerificationSchema,
};
