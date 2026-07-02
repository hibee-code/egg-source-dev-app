const Booking = require("../models/booking.model");

class BookingRepository {
  async create(data) {
    return Booking.create(data);
  }

  async findById(id) {
    return Booking.findById(id)
      .populate("buyerId", "firstName lastName email phone")
      .populate("poultryId", "businessName state lga address phoneNumber")
      .populate("productId", "productName category pricePerCrate imageUrl");
  }

  async findAll(filter = {}) {
    return Booking.find(filter)
      .populate("buyerId", "firstName lastName email phone")
      .populate("poultryId", "businessName state lga address phoneNumber")
      .populate("productId", "productName category pricePerCrate imageUrl")
      .sort({ createdAt: -1 });
  }

  async findByBuyer(buyerId) {
    return this.findAll({ buyerId });
  }

  async findByFarms(poultryIds) {
    return this.findAll({ poultryId: { $in: poultryIds } });
  }

  async update(id, updateData) {
    return Booking.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("buyerId", "firstName lastName email phone")
      .populate("poultryId", "businessName state lga address phoneNumber")
      .populate("productId", "productName category pricePerCrate imageUrl");
  }

  async delete(id) {
    return Booking.findByIdAndDelete(id);
  }
}

module.exports = new BookingRepository();
