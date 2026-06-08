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
  address: Joi.string().trim().required().messages({
    "any.required": "Address is required",
  }),
  phoneNumber: Joi.string().trim().required().messages({
    "any.required": "Phone number is required",
  }),
  description: Joi.string().trim().allow("").optional(),
  deliveryAvailable: Joi.boolean().optional(),
  rating: Joi.number().min(0).max(5).optional(),
  longitude: Joi.number().min(-180).max(180).required().messages({
    "any.required": "Longitude is required",
  }),
  latitude: Joi.number().min(-90).max(90).required().messages({
    "any.required": "Latitude is required",
  }),
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
}).min(1).messages({
  "object.min": "Please provide at least one field to update",
});

module.exports = {
  createPoultrySchema,
  updatePoultrySchema,
};
