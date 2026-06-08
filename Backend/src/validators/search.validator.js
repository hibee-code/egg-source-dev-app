const Joi = require("joi");

const searchQuerySchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).optional()
    .with("longitude") // If latitude is present, longitude must also be present
    .messages({
      "object.with": "Longitude is required when Latitude is specified",
    }),
  longitude: Joi.number().min(-180).max(180).optional()
    .with("latitude") // If longitude is present, latitude must also be present
    .messages({
      "object.with": "Latitude is required when Longitude is specified",
    }),
  maxDistance: Joi.number().min(0).optional(),
  state: Joi.string().trim().optional(),
  lga: Joi.string().trim().optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  deliveryAvailable: Joi.boolean().optional(),
  stockAvailable: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

module.exports = {
  searchQuerySchema,
};
