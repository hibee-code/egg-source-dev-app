const AuditLog = require("../models/auditLog.model");

class AuditLogService {
  async log(userId, action, ipAddress, userAgent, details = {}, severity = "INFO") {
    try {
      await AuditLog.create({
        userId: userId || null,
        action,
        ipAddress: ipAddress || "",
        userAgent: userAgent || "",
        details,
        severity,
      });
    } catch (err) {
      // Fail-safe to prevent audit logging failures from blocking main flows
      console.error("Audit Logging failed:", err.message);
    }
  }
}

module.exports = new AuditLogService();
