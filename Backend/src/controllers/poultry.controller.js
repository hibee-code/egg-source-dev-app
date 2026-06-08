const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/ApiResponse");
const poultryService = require("../services/poultry.service");

const createPoultry = catchAsync(async (req, res) => {
  const { longitude, latitude, ...rest } = req.body;
  const poultryData = {
    ...rest,
    location: {
      type: "Point",
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    },
  };

  const poultry = await poultryService.createPoultry(poultryData, req.user._id);

  sendSuccess(res, 201, "Poultry farm created successfully", { poultry });
});

const getPoultries = catchAsync(async (req, res) => {
  const poultries = await poultryService.getPoultries(req.query);
  sendSuccess(res, 200, "Poultries retrieved successfully", { poultries });
});

const getPoultryById = catchAsync(async (req, res) => {
  const poultry = await poultryService.getPoultryById(req.params.id);
  sendSuccess(res, 200, "Poultry farm retrieved successfully", { poultry });
});

const updatePoultry = catchAsync(async (req, res) => {
  const { longitude, latitude, ...rest } = req.body;
  const updateData = { ...rest };

  if (longitude !== undefined && latitude !== undefined) {
    updateData.location = {
      type: "Point",
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    };
  }

  const poultry = await poultryService.updatePoultry(
    req.params.id,
    updateData,
    req.user._id,
    req.user.role
  );

  sendSuccess(res, 200, "Poultry farm updated successfully", { poultry });
});

const deletePoultry = catchAsync(async (req, res) => {
  await poultryService.deletePoultry(req.params.id, req.user._id, req.user.role);
  sendSuccess(res, 200, "Poultry farm deleted successfully");
});

module.exports = {
  createPoultry,
  getPoultries,
  getPoultryById,
  updatePoultry,
  deletePoultry,
};
