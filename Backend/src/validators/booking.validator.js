const Joi = require("joi");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createBookingSchema = Joi.object({
  productId: Joi.string().pattern(objectIdRegex).required().messages({
    "any.required": "Product ID is required",
    "string.pattern.base": "Product ID must be a valid ObjectId",
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    "any.required": "Quantity is required",
    "number.min": "Quantity must be at least 1",
  }),
  deliveryMethod: Joi.string()
    .valid("pickup", "delivery")
    .required()
    .messages({
      "any.required": "Delivery method is required",
      "any.only": "Delivery method must be either 'pickup' or 'delivery'",
    }),
  deliveryAddress: Joi.object({
    fullName: Joi.string().trim().required().messages({
      "any.required": "Full name is required",
    }),
    phone: Joi.string().trim().required().messages({
      "any.required": "Phone number is required",
    }),
    street: Joi.string().trim().allow("").optional(),
    city: Joi.string().trim().allow("").optional(),
    state: Joi.string().trim().allow("").optional(),
    zip: Joi.string().trim().allow("").optional(),
  })
    .required()
    .messages({
      "any.required": "Delivery address is required",
    }),
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid("Pending", "Confirmed", "In Transit", "Delivered", "Cancelled")
    .required()
    .messages({
      "any.required": "Status is required",
      "any.only":
        "Status must be one of: Pending, Confirmed, In Transit, Delivered, Cancelled",
    }),
});

const queryBookingSchema = Joi.object({
  status: Joi.string()
    .valid("Pending", "Confirmed", "In Transit", "Delivered", "Cancelled")
    .optional(),
  poultryId: Joi.string().pattern(objectIdRegex).optional(),
});

module.exports = {
  createBookingSchema,
  updateStatusSchema,
  queryBookingSchema,
};
