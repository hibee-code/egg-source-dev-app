const Joi = require("joi");

const updateUserStatusSchema = Joi.object({
  isActive: Joi.boolean().required().messages({
    "any.required": "isActive status is required",
    "boolean.base": "isActive status must be a boolean value",
  }),
});

module.exports = {
  updateUserStatusSchema,
};
