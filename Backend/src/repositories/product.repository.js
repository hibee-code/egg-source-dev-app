const Product = require("../models/product.model");

class ProductRepository {
  async create(data) {
    return Product.create(data);
  }

  async findById(id) {
    return Product.findById(id).populate("poultryId", "businessName location");
  }

  async findOne(filter) {
    return Product.findOne(filter);
  }

  async findAll(query = {}) {
    const filter = {};

    if (query.poultryId) {
      filter.poultryId = query.poultryId;
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (query.isAvailable !== undefined) {
      filter.isAvailable = query.isAvailable === "true" || query.isAvailable === true;
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.pricePerCrate = {};
      if (query.minPrice !== undefined) {
        filter.pricePerCrate.$gte = parseFloat(query.minPrice);
      }
      if (query.maxPrice !== undefined) {
        filter.pricePerCrate.$lte = parseFloat(query.maxPrice);
      }
    }

    return Product.find(filter).populate("poultryId", "businessName location");
  }

  async update(id, updateData) {
    return Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id) {
    return Product.findByIdAndDelete(id);
  }

  async deleteMany(filter) {
    return Product.deleteMany(filter);
  }
}

module.exports = new ProductRepository();
