const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "revoked"],
      default: "pending",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically delete expired invitations after expiration timestamp
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Invitation = mongoose.model("Invitation", invitationSchema);

module.exports = Invitation;
