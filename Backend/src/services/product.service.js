const productRepository = require("../repositories/product.repository");
const poultryRepository = require("../repositories/poultry.repository");
const ApiError = require("../utils/ApiError");

const fs = require("fs");
const path = require("path");

const saveBase64Image = (base64Str) => {
  if (!base64Str || !base64Str.startsWith("data:image")) {
    return base64Str;
  }
  try {
    const matches = base64Str.match(/^data:image\/([A-Za-z-+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64Str;
    }
    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const filename = `product-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    
    // Target directory: Frontend/uploads
    const uploadDir = path.join(__dirname, "../../../Frontend/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(uploadDir, filename), buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error("Failed to save base64 image:", err);
    return base64Str;
  }
};

class ProductService {
  async createProduct(data, userId, userRole) {
    // Verify poultry exists
    const poultry = await poultryRepository.findById(data.poultryId);
    if (!poultry) {
      throw ApiError.notFound("Poultry farm not found");
    }

    // Verify ownership or ADMIN
    const ownerIdStr = poultry.ownerId._id?.toString() || poultry.ownerId.toString();
    if (ownerIdStr !== userId.toString() && userRole !== "SUPER_ADMIN") {
      throw ApiError.forbidden("You do not have permission to add products to this poultry farm");
    }

    // Save base64 image if present
    if (data.imageUrl) {
      data.imageUrl = saveBase64Image(data.imageUrl);
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

    const ownerIdStr = poultry.ownerId._id?.toString() || poultry.ownerId.toString();
    if (ownerIdStr !== userId.toString() && userRole !== "SUPER_ADMIN") {
      throw ApiError.forbidden("You do not have permission to update products for this poultry farm");
    }

    // Save base64 image if present
    if (updateData.imageUrl) {
      updateData.imageUrl = saveBase64Image(updateData.imageUrl);
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

    const ownerIdStr = poultry.ownerId._id?.toString() || poultry.ownerId.toString();
    if (ownerIdStr !== userId.toString() && userRole !== "SUPER_ADMIN") {
      throw ApiError.forbidden("You do not have permission to delete products from this poultry farm");
    }

    return productRepository.delete(id);
  }
}

module.exports = new ProductService();
