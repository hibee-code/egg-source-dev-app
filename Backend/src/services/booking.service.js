const bookingRepository = require("../repositories/booking.repository");
const productRepository = require("../repositories/product.repository");
const poultryRepository = require("../repositories/poultry.repository");
const ApiError = require("../utils/ApiError");

const SHIPPING_FEE = 1500; // ₦1,500 flat rate for delivery
const SERVICE_FEE_RATE = 0.025; // 2.5%

class BookingService {
  /**
   * Create a new booking.
   * Validates product availability, calculates pricing, decrements stock.
   *
   * @param {Object} data - { productId, quantity, deliveryMethod, deliveryAddress }
   * @param {string} userId - Authenticated buyer's user ID
   * @returns {Object} Created booking document
   */
  async createBooking(data, userId) {
    // 1. Verify product exists and is available
    const product = await productRepository.findById(data.productId);
    if (!product) {
      throw ApiError.notFound("Product not found");
    }
    if (!product.isAvailable) {
      throw ApiError.badRequest("This product is currently unavailable");
    }
    if (product.stockQuantity < data.quantity) {
      throw ApiError.badRequest(
        `Insufficient stock. Only ${product.stockQuantity} crates available.`
      );
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

    // 3. Calculate pricing
    const pricePerCrate = product.pricePerCrate;
    const subtotal = pricePerCrate * data.quantity;
    const shippingFee = data.deliveryMethod === "delivery" ? SHIPPING_FEE : 0;
    const serviceFee = Math.round((subtotal + shippingFee) * SERVICE_FEE_RATE);
    const totalAmount = subtotal + shippingFee + serviceFee;

    // 4. Create booking
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
      status: "Pending",
    });

    // 5. Decrement product stock
    await productRepository.update(product._id, {
      stockQuantity: product.stockQuantity - data.quantity,
    });

    // 6. Return populated booking
    return bookingRepository.findById(booking._id);
  }

  /**
   * Get a single booking by ID.
   * Only the buyer, the farm owner, or an admin can view it.
   */
  async getBookingById(id, userId, userRole) {
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
    return bookingRepository.findByBuyer(userId);
  }

  /**
   * Get all bookings for farms owned by the current user.
   */
  async getFarmBookings(userId) {
    // Find all poultry farms owned by this user
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

    return bookingRepository.update(id, { status });
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

    // Restore product stock
    const product = await productRepository.findById(
      booking.productId._id || booking.productId
    );
    if (product) {
      await productRepository.update(product._id, {
        stockQuantity: product.stockQuantity + booking.quantity,
      });
    }

    return bookingRepository.update(id, { status: "Cancelled" });
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
