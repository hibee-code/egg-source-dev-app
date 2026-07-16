const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    action: {
      type: String,
      required: [true, "Action is required"],
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL"],
      default: "INFO",
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ severity: 1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
