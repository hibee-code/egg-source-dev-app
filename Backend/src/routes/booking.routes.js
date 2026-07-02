const { Router } = require("express");
const bookingController = require("../controllers/booking.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createBookingSchema,
  updateStatusSchema,
} = require("../validators/booking.validator");
const { ROLES } = require("../constants/roles");

const router = Router();

// All booking routes require authentication
router.use(protect);

// Buyer creates a booking
router.post(
  "/",
  validate(createBookingSchema),
  bookingController.createBooking
);

// Buyer gets their own bookings
router.get("/my", bookingController.getBuyerBookings);

// Farm owner gets bookings for their farms
router.get(
  "/farm",
  restrictTo(ROLES.FARM_OWNER, ROLES.ADMIN),
  bookingController.getFarmBookings
);

// Get a single booking by ID
router.get("/:id", bookingController.getBookingById);

// Farm owner / admin updates booking status
router.patch(
  "/:id/status",
  restrictTo(ROLES.FARM_OWNER, ROLES.ADMIN),
  validate(updateStatusSchema),
  bookingController.updateBookingStatus
);

// Buyer cancels their own booking
router.patch("/:id/cancel", bookingController.cancelBooking);

module.exports = router;
