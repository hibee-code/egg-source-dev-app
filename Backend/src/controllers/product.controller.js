const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/ApiResponse");
const productService = require("../services/product.service");

const createProduct = catchAsync(async (req, res) => {
  const product = await productService.createProduct(
    req.body,
    req.user._id,
    req.user.role
  );
  sendSuccess(res, 201, "Product created successfully", { product });
});

const getProducts = catchAsync(async (req, res) => {
  const products = await productService.getProducts(req.query);
  sendSuccess(res, 200, "Products retrieved successfully", { products });
});

const getProductById = catchAsync(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  sendSuccess(res, 200, "Product retrieved successfully", { product });
});

const updateProduct = catchAsync(async (req, res) => {
  const product = await productService.updateProduct(
    req.params.id,
    req.body,
    req.user._id,
    req.user.role
  );
  sendSuccess(res, 200, "Product updated successfully", { product });
});

const deleteProduct = catchAsync(async (req, res) => {
  await productService.deleteProduct(req.params.id, req.user._id, req.user.role);
  sendSuccess(res, 200, "Product deleted successfully");
});

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
