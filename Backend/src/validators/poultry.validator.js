const Joi = require("joi");

const createPoultrySchema = Joi.object({
  businessName: Joi.string().trim().required().messages({
    "any.required": "Business name is required",
  }),
  state: Joi.string().trim().required().messages({
    "any.required": "State is required",
  }),
  lga: Joi.string().trim().required().messages({
    "any.required": "LGA is required",
  }),
  address: Joi.string().trim().allow("").optional().default("Main Office / Operations Address"),
  phoneNumber: Joi.string().trim().allow("").optional().default(""),
  description: Joi.string().trim().allow("").optional(),
  farmType: Joi.string().valid("farmer", "depot").optional().default("farmer"),
  deliveryAvailable: Joi.boolean().optional().default(true),
  rating: Joi.number().min(0).max(5).optional(),
  longitude: Joi.number().min(-180).max(180).optional().default(3.3792),
  latitude: Joi.number().min(-90).max(90).optional().default(6.5244),
});

const updatePoultrySchema = Joi.object({
  businessName: Joi.string().trim().optional(),
  state: Joi.string().trim().optional(),
  lga: Joi.string().trim().optional(),
  address: Joi.string().trim().optional(),
  phoneNumber: Joi.string().trim().optional(),
  description: Joi.string().trim().allow("").optional(),
  deliveryAvailable: Joi.boolean().optional(),
  rating: Joi.number().min(0).max(5).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
})
  .and("latitude", "longitude")
  .min(1)
  .messages({
    "object.min": "Please provide at least one field to update",
    "object.and": "Both latitude and longitude must be provided together",
  });

module.exports = {
  createPoultrySchema,
  updatePoultrySchema,
};
