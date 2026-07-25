const User = require("../models/user.model");
const logger = require("../utils/logger");
const env = require("./env");

const seedSuperAdmin = async () => {
  const email = env.INITIAL_ADMIN_EMAIL || "admin@eggconnect.app";
  const password = env.INITIAL_ADMIN_PASSWORD || "AdminPass123!";

  const adminExists = await User.findOne({ 
    $or: [{ role: "SUPER_ADMIN" }, { email }] 
  });

  if (adminExists) {
    throw new Error("Super Admin already exists.");
  }

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

  logger.info("✅ Super Admin created.");
  return "Super Admin created.";
};

module.exports = seedSuperAdmin;
