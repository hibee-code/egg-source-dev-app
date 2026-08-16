const initInventoryCleanupJob = require("./inventoryCleanup.job");
const logger = require("../utils/logger");

/**
 * Bootstraps all background cron jobs.
 */
const initJobs = () => {
  logger.info("⚙️ [JOBS]: Bootstrapping background tasks...");
  try {
    initInventoryCleanupJob();
  } catch (error) {
    logger.error("❌ [JOBS ERROR]: Critical failure during background job initialization:", error);
  }
};

module.exports = {
  initJobs,
};
