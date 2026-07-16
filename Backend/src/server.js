const app = require("./app");
const connectDB = require("./config/db");
const env = require("./config/env");
const logger = require("./utils/logger");

// ── Handle uncaught exceptions ────────────────────────────
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION 💥 Shutting down...");
  logger.error(`${err.name}: ${err.message}`);
  process.exit(1);
});

// ── Connect to database and start server ──────────────────
const seedSuperAdmin = require("./config/seed");

const startServer = async () => {
  await connectDB();
  await seedSuperAdmin();

  const server = app.listen(env.PORT, () => {
    logger.info(
      `🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`
    );
    logger.info(`   Local:  http://localhost:${env.PORT}`);
    logger.info(`   Health: http://localhost:${env.PORT}/api/v1/health`);
  });

  // ── Handle unhandled promise rejections ────────────────
  process.on("unhandledRejection", (err) => {
    logger.error("UNHANDLED REJECTION 💥 Shutting down...");
    logger.error(`${err.name}: ${err.message}`);
    server.close(() => {
      process.exit(1);
    });
  });

  // ── Graceful shutdown ──────────────────────────────────
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received. Shutting down gracefully...");
    server.close(() => {
      logger.info("Process terminated.");
    });
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT received. Shutting down gracefully...");
    server.close(() => {
      logger.info("Process terminated.");
    });
  });
};

startServer();
