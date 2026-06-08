const { Router } = require("express");
const searchController = require("../controllers/search.controller");
const validate = require("../middleware/validate.middleware");
const { searchQuerySchema } = require("../validators/search.validator");

const router = Router();

// Public search endpoint
router.get("/poultries", validate(searchQuerySchema, "query"), searchController.searchPoultries);

module.exports = router;
