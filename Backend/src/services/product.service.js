const productRepository = require("../repositories/product.repository");
const poultryRepository = require("../repositories/poultry.repository");
const ApiError = require("../utils/ApiError");

class ProductService {
  async createProduct(data, userId, userRole) {
    // Verify poultry exists
    const poultry = await poultryRepository.findById(data.poultryId);
    if (!poultry) {
      throw ApiError.notFound("Poultry farm not found");
    }

    // Verify ownership or ADMIN
    if (poultry.ownerId.toString() !== userId.toString() && userRole !== "ADMIN") {
      throw ApiError.forbidden("You do not have permission to add products to this poultry farm");
    }

    return productRepository.create(data);
  }

  async getProductById(id) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw ApiError.notFound("Product not found");
    }
    return product;
  }

  async getProducts(query = {}) {
    return productRepository.findAll(query);
  }

  async updateProduct(id, updateData, userId, userRole) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw ApiError.notFound("Product not found");
    }

    // Verify poultry ownership of this product
    const poultry = await poultryRepository.findById(product.poultryId);
    if (!poultry) {
      throw ApiError.notFound("Associated poultry farm not found");
    }

    if (poultry.ownerId.toString() !== userId.toString() && userRole !== "ADMIN") {
      throw ApiError.forbidden("You do not have permission to update products for this poultry farm");
    }

    return productRepository.update(id, updateData);
  }

  async deleteProduct(id, userId, userRole) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw ApiError.notFound("Product not found");
    }

    // Verify poultry ownership
    const poultry = await poultryRepository.findById(product.poultryId);
    if (!poultry) {
      throw ApiError.notFound("Associated poultry farm not found");
    }

    if (poultry.ownerId.toString() !== userId.toString() && userRole !== "ADMIN") {
      throw ApiError.forbidden("You do not have permission to delete products from this poultry farm");
    }

    return productRepository.delete(id);
  }
}

module.exports = new ProductService();
