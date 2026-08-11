const bookingRepository = require("../repositories/booking.repository");
const productRepository = require("../repositories/product.repository");
const poultryRepository = require("../repositories/poultry.repository");
const ApiError = require("../utils/ApiError");

const logger = require("../utils/logger");

const SHIPPING_FEE = 1500; // ₦1,500 flat rate for delivery
const SERVICE_FEE_RATE = 0.025; // 2.5%
const RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 minutes hold for unpaid pending bookings

class BookingService {
  /**
   * Release expired unpaid reservations and restore product stock.
   */
  async releaseExpiredReservations() {
    try {
      const expiredBookings = await bookingRepository.findExpiredPendingReservations();
      for (const booking of expiredBookings) {
        booking.status = "Cancelled";
        await booking.save();
        await productRepository.incrementStock(booking.productId, booking.quantity);
        logger.info(
          `⏱️ [RESERVATION EXPIRED]: Released ${booking.quantity} stock for product ${booking.productId} from cancelled booking ${booking._id}`
        );
      }
    } catch (err) {
      logger.error("Error releasing expired reservations:", err);
    }
  }

  /**
   * Create a new booking.
   * Validates availability, performs atomic stock decrement, saves product snapshot & reservation expiry.
   *
   * @param {Object} data - { productId, quantity, deliveryMethod, deliveryAddress, scheduledSlot }
   * @param {string} userId - Authenticated buyer's user ID
   * @returns {Object} Created booking document
   */
  async createBooking(data, userId) {
    // Proactively clean up expired reservations to free up stock pool
    await this.releaseExpiredReservations();

    // 1. Verify product exists and is available
    const product = await productRepository.findById(data.productId);
    if (!product) {
      throw ApiError.notFound("Product not found");
    }
    if (!product.isAvailable) {
      throw ApiError.badRequest("This product is currently unavailable");
    }

    // 2. Get the poultry farm
    const poultryId =
      typeof product.poultryId === "object" && product.poultryId._id
        ? product.poultryId._id
        : product.poultryId;

    const poultry = await poultryRepository.findById(poultryId);
    if (!poultry) {
      throw ApiError.notFound("Associated poultry farm not found");
    }

    // 3. Atomically decrement stock to prevent race condition overselling
    const updatedProduct = await productRepository.decrementStock(product._id, data.quantity);
    if (!updatedProduct) {
      throw ApiError.badRequest(
        `Insufficient stock available or item was reserved by another buyer.`
      );
    }

    // 4. Calculate pricing
    const pricePerCrate = product.pricePerCrate;
    const subtotal = pricePerCrate * data.quantity;
    const shippingFee = data.deliveryMethod === "delivery" ? SHIPPING_FEE : 0;
    const serviceFee = Math.round((subtotal + shippingFee) * SERVICE_FEE_RATE);
    const totalAmount = subtotal + shippingFee + serviceFee;

    // 5. Build historical product/farm snapshot
    const farmLocationStr = poultry.location
      ? `${poultry.location.city || ""}, ${poultry.location.state || ""}`.trim()
      : "";
    const productSnapshot = {
      productName: product.productName,
      category: product.category,
      farmName: poultry.businessName || "",
      farmLocation: farmLocationStr,
    };

    // 6. Set unpaid reservation expiration threshold (15 mins)
    const reservationExpiresAt = new Date(Date.now() + RESERVATION_TTL_MS);

    // 7. Create booking with unique scheduled slot handling
    try {
      const booking = await bookingRepository.create({
        buyerId: userId,
        poultryId: poultryId,
        productId: data.productId,
        quantity: data.quantity,
        pricePerCrate,
        subtotal,
        shippingFee,
        serviceFee,
        totalAmount,
        deliveryMethod: data.deliveryMethod,
        deliveryAddress: data.deliveryAddress,
        scheduledSlot: data.scheduledSlot,
        productSnapshot,
        reservationExpiresAt,
        status: "Pending",
      });

      return await bookingRepository.findById(booking._id);
    } catch (error) {
      // Rollback stock decrement if DB save fails
      await productRepository.incrementStock(product._id, data.quantity);

      if (error.code === 11000) {
        throw ApiError.conflict(
          "The requested scheduled time slot is already reserved by another user."
        );
      }
      throw error;
    }
  }

  /**
   * Get a single booking by ID.
   * Only the buyer, the farm owner, or an admin can view it.
   */
  async getBookingById(id, userId, userRole) {
    await this.releaseExpiredReservations();

    const booking = await bookingRepository.findById(id);
    if (!booking) {
      throw ApiError.notFound("Booking not found");
    }

    // Authorization: buyer, farm owner, or admin
    const isBuyer = booking.buyerId._id.toString() === userId.toString();
    const isFarmOwner = await this._isOwnerOfFarm(
      booking.poultryId._id || booking.poultryId,
      userId
    );
    const isAdmin = userRole === "SUPER_ADMIN";

    if (!isBuyer && !isFarmOwner && !isAdmin) {
      throw ApiError.forbidden("You do not have permission to view this booking");
    }

    return booking;
  }

  /**
   * Get all bookings for a buyer.
   */
  async getBuyerBookings(userId) {
    await this.releaseExpiredReservations();
    return bookingRepository.findByBuyer(userId);
  }

  /**
   * Get all bookings for farms owned by the current user.
   */
  async getFarmBookings(userId) {
    await this.releaseExpiredReservations();
    const farms = await poultryRepository.findAll({ ownerId: userId });
    if (!farms.length) {
      return [];
    }

    const farmIds = farms.map((farm) => farm._id);
    return bookingRepository.findByFarms(farmIds);
  }

  /**
   * Update booking status.
   * Only the farm owner or admin can update.
   */
  async updateBookingStatus(id, status, userId, userRole) {
    const booking = await bookingRepository.findById(id);
    if (!booking) {
      throw ApiError.notFound("Booking not found");
    }

    // Authorization: farm owner or admin
    const isFarmOwner = await this._isOwnerOfFarm(
      booking.poultryId._id || booking.poultryId,
      userId
    );
    const isAdmin = userRole === "SUPER_ADMIN";

    if (!isFarmOwner && !isAdmin) {
      throw ApiError.forbidden(
        "You do not have permission to update this booking"
      );
    }

    // If status is updated to Confirmed or beyond, clear reservationExpiresAt
    const updatePayload = { status };
    if (status !== "Pending") {
      updatePayload.reservationExpiresAt = null;
    }

    return bookingRepository.update(id, updatePayload);
  }

  /**
   * Cancel a booking.
   * Only the buyer can cancel, and only if status is still Pending.
   */
  async cancelBooking(id, userId) {
    const booking = await bookingRepository.findById(id);
    if (!booking) {
      throw ApiError.notFound("Booking not found");
    }

    // Only the buyer who placed the order can cancel
    if (booking.buyerId._id.toString() !== userId.toString()) {
      throw ApiError.forbidden("You can only cancel your own bookings");
    }

    if (booking.status !== "Pending") {
      throw ApiError.badRequest(
        `Cannot cancel a booking with status "${booking.status}". Only pending bookings can be cancelled.`
      );
    }

    // Atomically restore product stock
    const productId = booking.productId._id || booking.productId;
    await productRepository.incrementStock(productId, booking.quantity);

    return bookingRepository.update(id, { status: "Cancelled", reservationExpiresAt: null });
  }

  /**
   * Check if a user owns the given poultry farm.
   * @private
   */
  async _isOwnerOfFarm(poultryId, userId) {
    const poultry = await poultryRepository.findById(poultryId);
    if (!poultry) return false;
    const ownerIdStr = poultry.ownerId._id?.toString() || poultry.ownerId.toString();
    return ownerIdStr === userId.toString();
  }
}

module.exports = new BookingService();
