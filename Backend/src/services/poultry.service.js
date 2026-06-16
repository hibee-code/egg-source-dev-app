const poultryRepository = require("../repositories/poultry.repository");
const productRepository = require("../repositories/product.repository");
const ApiError = require("../utils/ApiError");

class PoultryService {
  async createPoultry(data, userId) {
    // Check if businessName already exists
    const existing = await poultryRepository.findOne({ businessName: data.businessName });
    if (existing) {
      throw ApiError.conflict("A poultry farm with this business name already exists");
    }

    return poultryRepository.create({
      ...data,
      ownerId: userId,
    });
  }

  async getPoultryById(id) {
    const poultry = await poultryRepository.findById(id);
    if (!poultry) {
      throw ApiError.notFound("Poultry farm not found");
    }
    return poultry;
  }

  async getPoultries(filter = {}) {
    return poultryRepository.findAll(filter);
  }

  async updatePoultry(id, updateData, userId, userRole) {
    const poultry = await poultryRepository.findById(id);
    if (!poultry) {
      throw ApiError.notFound("Poultry farm not found");
    }

    // Authorization: Must be owner or admin
    if (poultry.ownerId.toString() !== userId.toString() && userRole !== "ADMIN") {
      throw ApiError.forbidden("You do not have permission to update this poultry farm");
    }

    return poultryRepository.update(id, updateData);
  }

  async deletePoultry(id, userId, userRole) {
    const poultry = await poultryRepository.findById(id);
    if (!poultry) {
      throw ApiError.notFound("Poultry farm not found");
    }

    // Authorization: Must be owner or admin
    if (poultry.ownerId.toString() !== userId.toString() && userRole !== "ADMIN") {
      throw ApiError.forbidden("You do not have permission to delete this poultry farm");
    }

    // Cascade delete: Remove all products belonging to this poultry farm
    await productRepository.deleteMany({ poultryId: id });

    return poultryRepository.delete(id);
  }
}

module.exports = new PoultryService();
