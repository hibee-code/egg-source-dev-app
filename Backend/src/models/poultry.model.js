const mongoose = require("mongoose");

const poultrySchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      unique: true,
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner ID is required"],
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    lga: {
      type: String,
      required: [true, "LGA is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    deliveryAvailable: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be below 0"],
      max: [5, "Rating cannot exceed 5"],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, "Coordinates (longitude, latitude) are required"],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Create 2dsphere index for location search
poultrySchema.index({ location: "2dsphere" });
poultrySchema.index({ ownerId: 1 });

const Poultry = mongoose.model("Poultry", poultrySchema);

module.exports = Poultry;
