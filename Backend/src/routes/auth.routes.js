const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  resendVerificationSchema,
} = require("../validators/auth.validator");

const router = Router();

// ── Public routes ─────────────────────────────────────────
router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh-token", authController.refreshToken);
router.get("/verify-email/:token", authController.verifyEmail);
router.post(
  "/resend-verification",
  validate(resendVerificationSchema),
  authController.resendVerification
);
router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.patch(
  "/reset-password/:token",
  validate(resetPasswordSchema),
  authController.resetPassword
);

// ── Protected routes ──────────────────────────────────────
router.use(protect); // All routes below require authentication

router.post("/logout", authController.logout);
router.patch(
  "/change-password",
  validate(changePasswordSchema),
  authController.changePassword
);
router
  .route("/profile")
  .get(authController.getProfile)
  .patch(validate(updateProfileSchema), authController.updateProfile);

module.exports = router;
