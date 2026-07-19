const User = require("../models/user.model");
const logger = require("../utils/logger");
const env = require("./env");

const seedSuperAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: "SUPER_ADMIN" });
    if (!adminExists) {
      const email = env.INITIAL_ADMIN_EMAIL || "admin@eggconnect.app";
      const password = env.INITIAL_ADMIN_PASSWORD || "AdminPass123!";

      await User.create({
        firstName: "Platform",
        lastName: "Administrator",
        email,
        password,
        role: "SUPER_ADMIN",
        isVerified: true,
        isActive: true,
        phone: "08000000000",
      });
      logger.info(`✨ Seeded Super Admin account: ${email}`);
    }
  } catch (err) {
    logger.error("❌ Failed to seed Super Admin account:", err.message);
  }
};

module.exports = seedSuperAdmin;
