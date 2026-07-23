const connectDB = require('../config/db');
const seedSuperAdmin = require('../config/seed');
const logger = require('../utils/logger');

const run = async () => {
  try {
    await connectDB();
    await seedSuperAdmin();
    logger.info('✅ create-admin: Super admin created or already exists.');
    process.exit(0);
  } catch (err) {
    logger.error('❌ create-admin failed:', err.message);
    process.exit(1);
  }
};

run();
