const { Router } = require("express");
const authRoutes = require("./auth.routes");
const invitationRoutes = require("./invitation.routes");
const adminRoutes = require("./admin.routes");

const router = Router();

// ── Health check ──────────────────────────────────────────
router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Egg Connect API is running",
    timestamp: new Date().toISOString(),
  });
});

// ── Mount feature routes ──────────────────────────────────
router.use("/auth", authRoutes);
router.use("/invitations", invitationRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
