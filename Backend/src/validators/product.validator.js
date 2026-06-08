const Joi = require("joi");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createProductSchema = Joi.object({
  poultryId: Joi.string().pattern(objectIdRegex).required().messages({
    "any.required": "Poultry ID is required",
    "string.pattern.base": "Poultry ID must be a valid ObjectId",
  }),
  productName: Joi.string().trim().required().messages({
    "any.required": "Product name is required",
  }),
  category: Joi.string().trim().required().messages({
    "any.required": "Category is required",
  }),
  pricePerCrate: Joi.number().min(0).required().messages({
    "any.required": "Price per crate is required",
    "number.min": "Price per crate cannot be negative",
  }),
  stockQuantity: Joi.number().integer().min(0).required().messages({
    "any.required": "Stock quantity is required",
    "number.min": "Stock quantity cannot be negative",
  }),
  imageUrl: Joi.string().trim().allow("").optional(),
  isAvailable: Joi.boolean().optional(),
});

const updateProductSchema = Joi.object({
  productName: Joi.string().trim().optional(),
  category: Joi.string().trim().optional(),
  pricePerCrate: Joi.number().min(0).optional(),
  stockQuantity: Joi.number().integer().min(0).optional(),
  imageUrl: Joi.string().trim().allow("").optional(),
  isAvailable: Joi.boolean().optional(),
}).min(1).messages({
  "object.min": "Please provide at least one field to update",
});

const queryProductSchema = Joi.object({
  poultryId: Joi.string().pattern(objectIdRegex).optional(),
  category: Joi.string().trim().optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  isAvailable: Joi.boolean().optional(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  queryProductSchema,
};
