const { Router } = require("express");
const Joi = require("joi");
const invitationController = require("../controllers/invitation.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");

const router = Router();

// Joi schemas
const createInvitationSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  businessName: Joi.string().trim().min(2).max(100).required().messages({
    "string.min": "Business name must be at least 2 characters",
    "any.required": "Business name is required",
  }),
});

const acceptInvitationSchema = Joi.object({
  firstName: Joi.string().trim().required().messages({
    "any.required": "First name is required",
  }),
  lastName: Joi.string().trim().required().messages({
    "any.required": "Last name is required",
  }),
  phone: Joi.string().trim().required().messages({
    "any.required": "Phone number is required",
  }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters",
    "any.required": "Password is required",
  }),
  state: Joi.string().trim().required().messages({
    "any.required": "State is required",
  }),
  lga: Joi.string().trim().required().messages({
    "any.required": "LGA is required",
  }),
  address: Joi.string().trim().required().messages({
    "any.required": "Street address is required",
  }),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
});

// ── Public Routes ──────────────────────────────────────────
router.get("/verify/:token", invitationController.verifyInvitationToken);
router.post("/accept/:token", validate(acceptInvitationSchema), invitationController.acceptInvitation);

// ── Protected Routes (Super Admin Only) ────────────────────
router.use(protect);
// Restrict all remaining endpoints to users with Super Admin privileges
router.use(restrictTo("*")); 

router
  .route("/")
  .post(validate(createInvitationSchema), invitationController.createInvitation)
  .get(invitationController.getInvitations);

router.post("/:id/resend", invitationController.resendInvitation);
router.delete("/:id/revoke", invitationController.revokeInvitation);

module.exports = router;
