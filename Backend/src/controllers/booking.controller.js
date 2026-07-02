const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/ApiResponse");
const bookingService = require("../services/booking.service");

/**
 * @desc    Create a new booking
 * @route   POST /api/bookings
 * @access  Protected (any authenticated user)
 */
const createBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.createBooking(req.body, req.user._id);
  sendSuccess(res, 201, "Booking created successfully", { booking });
});

/**
 * @desc    Get buyer's own bookings
 * @route   GET /api/bookings/my
 * @access  Protected
 */
const getBuyerBookings = catchAsync(async (req, res) => {
  const bookings = await bookingService.getBuyerBookings(req.user._id);
  sendSuccess(res, 200, "Bookings retrieved successfully", { bookings });
});

/**
 * @desc    Get all bookings for the farm owner's farms
 * @route   GET /api/bookings/farm
 * @access  Protected (FARM_OWNER, ADMIN)
 */
const getFarmBookings = catchAsync(async (req, res) => {
  const bookings = await bookingService.getFarmBookings(req.user._id);
  sendSuccess(res, 200, "Farm bookings retrieved successfully", { bookings });
});

/**
 * @desc    Get a single booking by ID
 * @route   GET /api/bookings/:id
 * @access  Protected
 */
const getBookingById = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingById(
    req.params.id,
    req.user._id,
    req.user.role
  );
  sendSuccess(res, 200, "Booking retrieved successfully", { booking });
});

/**
 * @desc    Update booking status
 * @route   PATCH /api/bookings/:id/status
 * @access  Protected (FARM_OWNER, ADMIN)
 */
const updateBookingStatus = catchAsync(async (req, res) => {
  const booking = await bookingService.updateBookingStatus(
    req.params.id,
    req.body.status,
    req.user._id,
    req.user.role
  );
  sendSuccess(res, 200, "Booking status updated successfully", { booking });
});

/**
 * @desc    Cancel a booking
 * @route   PATCH /api/bookings/:id/cancel
 * @access  Protected (buyer only)
 */
const cancelBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.cancelBooking(
    req.params.id,
    req.user._id
  );
  sendSuccess(res, 200, "Booking cancelled successfully", { booking });
});

module.exports = {
  createBooking,
  getBuyerBookings,
  getFarmBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
};
