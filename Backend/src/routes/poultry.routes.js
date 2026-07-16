const { Router } = require("express");
const poultryController = require("../controllers/poultry.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { createPoultrySchema, updatePoultrySchema } = require("../validators/poultry.validator");
const { ROLES } = require("../constants/roles");

const router = Router();

// Public routes
router.get("/", poultryController.getPoultries);
router.get("/:id", poultryController.getPoultryById);

// Protected routes
router.use(protect);

// Restricted routes (only FARM_OWNER and SUPER_ADMIN can modify poultry data)
router.use(restrictTo(ROLES.FARM_OWNER, ROLES.SUPER_ADMIN));

router.post("/", validate(createPoultrySchema), poultryController.createPoultry);
router.patch("/:id", validate(updatePoultrySchema), poultryController.updatePoultry);
router.delete("/:id", poultryController.deletePoultry);

module.exports = router;
