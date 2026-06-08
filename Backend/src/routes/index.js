const { Router } = require("express");
const authRoutes = require("./auth.routes");

const router = Router();

// ── Health check ──────────────────────────────────────────
router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Egg Source API is running",
    timestamp: new Date().toISOString(),
  });
});

// ── Mount feature routes ──────────────────────────────────
router.use("/auth", authRoutes);

// Future modules will be mounted here:
// router.use("/farms", farmRoutes);
// router.use("/depots", depotRoutes);
// router.use("/products", productRoutes);
// router.use("/orders", orderRoutes);
// router.use("/bookings", bookingRoutes);

module.exports = router;
