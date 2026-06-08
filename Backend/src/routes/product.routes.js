const { Router } = require("express");
const productController = require("../controllers/product.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createProductSchema,
  updateProductSchema,
  queryProductSchema,
} = require("../validators/product.validator");
const { ROLES } = require("../constants/roles");

const router = Router();

// Public routes
router.get("/", validate(queryProductSchema, "query"), productController.getProducts);
router.get("/:id", productController.getProductById);

// Protected routes
router.use(protect);

// Restricted routes (only FARM_OWNER and ADMIN can create/modify products)
router.use(restrictTo(ROLES.FARM_OWNER, ROLES.ADMIN));

router.post("/", validate(createProductSchema), productController.createProduct);
router.patch("/:id", validate(updateProductSchema), productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

module.exports = router;
