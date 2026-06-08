const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/ApiResponse");
const searchService = require("../services/search.service");

const searchPoultries = catchAsync(async (req, res) => {
  const result = await searchService.searchPoultries(req.query);
  sendSuccess(res, 200, "Poultry search results retrieved successfully", result);
});

module.exports = {
  searchPoultries,
};
