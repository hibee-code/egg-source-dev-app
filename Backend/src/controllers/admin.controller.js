const User = require("../models/user.model");
const Poultry = require("../models/poultry.model");
const Product = require("../models/product.model");
const Booking = require("../models/booking.model");
const AuditLog = require("../models/auditLog.model");
const auditLogService = require("../services/auditLog.service");
const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");

/**
 * @desc    Get list of all registered users (buyers and sellers)
 * @route   GET /api/v1/admin/users
 * @access  Protected (Super Admin only)
 */
const getUsers = catchAsync(async (req, res) => {
  const { role, search } = req.query;
  const filter = {};

  if (role) {
    filter.role = role;
  }

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(filter).sort({ createdAt: -1 });
  sendSuccess(res, 200, "Users list retrieved successfully", users);
});

/**
 * @desc    Toggle user status (activate / suspend)
 * @route   PATCH /api/v1/admin/users/:id/status
 * @access  Protected (Super Admin only)
 */
const updateUserStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    throw ApiError.badRequest("isActive must be a boolean value");
  }

  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  if (user.role === "SUPER_ADMIN") {
    throw ApiError.badRequest("Cannot alter status of a Super Admin account");
  }

  user.isActive = isActive;
  await user.save();

  // Log action to audit log
  await auditLogService.log(
    req.user._id,
    isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    req.ip,
    req.headers["user-agent"],
    { targetUserId: user._id, targetEmail: user.email }
  );

  sendSuccess(res, 200, `User account ${isActive ? "activated" : "suspended"} successfully`, user);
});

/**
 * @desc    Get audit logs
 * @route   GET /api/v1/admin/audit-logs
 * @access  Protected (Super Admin only)
 */
const getAuditLogs = catchAsync(async (req, res) => {
  const logs = await AuditLog.find()
    .populate("userId", "firstName lastName email role")
    .sort({ createdAt: -1 })
    .limit(100);

  sendSuccess(res, 200, "Audit logs retrieved successfully", logs);
});

/**
 * @desc    Get platform stats overview
 * @route   GET /api/v1/admin/stats
 * @access  Protected (Super Admin only)
 */
const getDashboardStats = catchAsync(async (req, res) => {
  const [
    totalBuyers,
    totalSellers,
    totalFarms,
    totalProducts,
    totalBookings,
    recentLogins,
    recentAuditLogs,
  ] = await Promise.all([
    User.countDocuments({ role: "CUSTOMER" }),
    User.countDocuments({ role: "FARM_OWNER" }),
    Poultry.countDocuments(),
    Product.countDocuments(),
    Booking.countDocuments(),
    AuditLog.find({ action: "USER_LOGIN_SUCCESS" })
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(5),
    AuditLog.find()
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(10),
  ]);

  sendSuccess(res, 200, "Platform statistics retrieved successfully", {
    stats: {
      buyersCount: totalBuyers,
      sellersCount: totalSellers,
      farmsCount: totalFarms,
      productsCount: totalProducts,
      bookingsCount: totalBookings,
    },
    recentLogins,
    recentAuditLogs,
  });
});

module.exports = {
  getUsers,
  updateUserStatus,
  getAuditLogs,
  getDashboardStats,
};
