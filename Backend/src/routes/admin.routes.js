const { Router } = require("express");
const adminController = require("../controllers/admin.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

const router = Router();

// Protect all routes below
router.use(protect);
// Restrict to Super Admin
router.use(restrictTo("*"));

router.get("/users", adminController.getUsers);
router.patch("/users/:id/status", adminController.updateUserStatus);
router.get("/audit-logs", adminController.getAuditLogs);
router.get("/stats", adminController.getDashboardStats);

module.exports = router;
