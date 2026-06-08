const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    poultryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poultry",
      required: [true, "Poultry ID is required"],
    },
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    pricePerCrate: {
      type: Number,
      required: [true, "Price per crate is required"],
      min: [0, "Price per crate cannot be negative"],
    },
    stockQuantity: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock quantity cannot be negative"],
    },
    imageUrl: {
      type: String,
      default: "",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ poultryId: 1 });
productSchema.index({ category: 1 });
productSchema.index({ pricePerCrate: 1 });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
