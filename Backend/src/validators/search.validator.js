const Joi = require("joi");

const searchQuerySchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  maxDistance: Joi.number().min(0).optional(),
  state: Joi.string().trim().optional(),
  lga: Joi.string().trim().optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  deliveryAvailable: Joi.boolean().optional(),
  stockAvailable: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
})
  .and("latitude", "longitude")
  .messages({
    "object.and": "Both latitude and longitude must be provided together",
  });

module.exports = {
  searchQuerySchema,
};
