const connectDB = require('../config/db');
const seedSuperAdmin = require('../config/seed');
const logger = require('../utils/logger');

const run = async () => {
  try {
    await connectDB();
    await seedSuperAdmin();
    process.exit(0);
  } catch (err) {
    logger.error(`❌ ${err.message}`);
    process.exit(1);
  }
};

run();
