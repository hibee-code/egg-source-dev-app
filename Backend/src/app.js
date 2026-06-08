const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const env = require("./config/env");
const routes = require("./routes");
const poultryRoutes = require("./routes/poultry.routes");
const productRoutes = require("./routes/product.routes");
const searchRoutes = require("./routes/search.routes");
const errorMiddleware = require("./middleware/error.middleware");
const ApiError = require("./utils/ApiError");

const app = express();

// ── Security headers ──────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true, // Allow cookies (refresh token)
  })
);

// ── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── Cookie parsing ────────────────────────────────────────
app.use(cookieParser());

// ── Request logging ───────────────────────────────────────
if (env.isDevelopment) {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ── API routes ────────────────────────────────────────────
app.use("/api/v1", routes);
app.use("/api/poultries", poultryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/search", searchRoutes);

// ── Root route ────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Egg Source Dev App API",
    version: "1.0.0",
    docs: "/api/v1/health",
  });
});

// ── 404 handler ───────────────────────────────────────────
app.all("*", (req, _res, next) => {
  next(ApiError.notFound(`Cannot find ${req.method} ${req.originalUrl}`));
});

// ── Global error handler ──────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
