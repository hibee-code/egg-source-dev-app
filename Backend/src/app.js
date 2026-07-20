const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const env = require("./config/env");
const routes = require("./routes");
const poultryRoutes = require("./routes/poultry.routes");
const productRoutes = require("./routes/product.routes");
const searchRoutes = require("./routes/search.routes");
const bookingRoutes = require("./routes/booking.routes");
const errorMiddleware = require("./middleware/error.middleware");
const ApiError = require("./utils/ApiError");

const app = express();

// ── Security headers ──────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
        connectSrc: ["'self'"],
      },
    },
  })
);

// ── CORS ──────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true, // Allow cookies (refresh token)
  })
);

// ── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
app.use("/api/bookings", bookingRoutes);

// ── Serve static frontend assets ──────────────────────────
const FRONTEND_DIR = path.join(__dirname, "../../Frontend");
app.use(express.static(FRONTEND_DIR));

// ── Clean Page Routes ──────────────────────────────────────
app.get("/", (_req, res) => res.sendFile(path.join(FRONTEND_DIR, "index.html")));
app.get(["/login", "/register", "/auth"], (_req, res) => res.sendFile(path.join(FRONTEND_DIR, "pages/auth.html")));
app.get("/marketplace", (_req, res) => res.sendFile(path.join(FRONTEND_DIR, "pages/marketplace.html")));
app.get("/farm-detail", (_req, res) => res.sendFile(path.join(FRONTEND_DIR, "pages/farm-detail.html")));
app.get(["/dashboard-buyer", "/dashboard/buyer"], (_req, res) => res.sendFile(path.join(FRONTEND_DIR, "pages/dashboard-buyer.html")));
app.get(["/dashboard-farm", "/dashboard/farm"], (_req, res) => res.sendFile(path.join(FRONTEND_DIR, "pages/dashboard-farm.html")));
app.get(["/dashboard-admin", "/dashboard/admin"], (_req, res) => res.sendFile(path.join(FRONTEND_DIR, "pages/dashboard-admin.html")));
app.get("/privacy", (_req, res) => res.sendFile(path.join(FRONTEND_DIR, "pages/privacy.html")));
app.get("/terms", (_req, res) => res.sendFile(path.join(FRONTEND_DIR, "pages/terms.html")));
app.get(["/register-invite", "/invite"], (_req, res) => res.sendFile(path.join(FRONTEND_DIR, "pages/register-invite.html")));

// ── Root SPA fallback route for unrecognized paths ─────────
app.get(/^(?!\/api).*$/, (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

// ── 404 handler ───────────────────────────────────────────
app.all("*all", (req, _res, next) => {
  next(ApiError.notFound(`Cannot find ${req.method} ${req.originalUrl}`));
});

// ── Global error handler ──────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
