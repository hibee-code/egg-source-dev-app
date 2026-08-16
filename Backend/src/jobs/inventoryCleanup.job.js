const cron = require("node-cron");
const bookingService = require("../services/booking.service");
const logger = require("../utils/logger");

/**
 * Initializes the background job to release expired reservations.
 * Runs every minute to reclaim abandoned inventory.
 */
const initInventoryCleanupJob = () => {
  // Cron schedule: Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      logger.info("⏱️ [CRON]: Scanning for expired unpaid reservations...");
      await bookingService.releaseExpiredReservations();
    } catch (error) {
      logger.error("❌ [CRON ERROR]: Failed during inventory cleanup execution:", error);
    }
  });

  logger.info("📅 [CRON]: Inventory cleanup job scheduled (runs every minute).");
};

module.exports = initInventoryCleanupJob;
