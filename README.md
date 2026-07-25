# 🥚 Egg Connect

> **A digital-powered poultry and egg sourcing platform connecting verified farm sellers with buyers across Nigeria.**

Egg Connect is a full-stack marketplace that enables direct crate bookings between poultry farmers / egg depots and commercial buyers. It features a verified seller hub, real-time inventory management, GPS-based marketplace discovery, and a buyer dashboard for end-to-end order tracking.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [API Reference](#api-reference)
- [Authentication Flow](#authentication-flow)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Database Seeding](#database-seeding)
- [Frontend Pages](#frontend-pages)
- [Security](#security)
- [License](#license)

---

## Overview

Egg Connect solves a fragmented supply-chain problem in Nigeria's poultry industry. Buyers can:
- Discover verified local farms and depots by state, LGA, or GPS radius
- Book crates directly with price transparency
- Track bookings end-to-end through a dedicated dashboard

Sellers can:
- Onboard their farm or depot in under a minute
- Manage inventory and receive live booking requests
- Accept, reject, or fulfil orders through a clean seller hub

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js v5 |
| Database | MongoDB via Mongoose v9 |
| Authentication | JWT (Access + Refresh tokens), httpOnly cookies |
| Password Hashing | Argon2 + Bcrypt |
| Email | Resend SDK |
| Validation | Joi |
| Logging | Winston |
| Rate Limiting | express-rate-limit |
| Security Headers | Helmet |
| Dev Server | Nodemon |

### Frontend
| Layer | Technology |
|---|---|
| Structure | Vanilla HTML5 |
| Styling | Vanilla CSS (custom design system via `tokens.css`) |
| JavaScript | Vanilla ES Modules (no framework) |
| Icons | Lucide Icons (CDN) |
| Fonts | Google Fonts — Inter |
| PWA | Service Worker + Web App Manifest |

---

## Project Structure

```
egg-source-dev-app/
├── Backend/
│   └── src/
│       ├── app.js                  # Express app setup, middleware, static serving
│       ├── server.js               # HTTP server entry point
│       ├── config/
│       │   └── env.js              # Typed environment config
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── admin.controller.js
│       │   ├── booking.controller.js
│       │   ├── poultry.controller.js
│       │   ├── product.controller.js
│       │   └── search.controller.js
│       ├── middleware/
│       │   ├── auth.middleware.js       # JWT protect + role guards
│       │   ├── error.middleware.js      # Global error handler
│       │   ├── rateLimiter.middleware.js
│       │   └── validate.middleware.js   # Joi schema validation
│       ├── models/
│       │   ├── user.model.js
│       │   ├── poultry.model.js
│       │   ├── product.model.js
│       │   ├── booking.model.js
│       │   └── auditLog.model.js
│       ├── routes/
│       │   ├── index.js
│       │   ├── auth.routes.js
│       │   ├── admin.routes.js
│       │   ├── booking.routes.js
│       │   ├── poultry.routes.js
│       │   ├── product.routes.js
│       │   └── search.routes.js
│       ├── services/
│       │   ├── auth.service.js
│       │   ├── booking.service.js
│       │   ├── email.service.js
│       │   ├── poultry.service.js
│       │   ├── product.service.js
│       │   ├── search.service.js
│       │   └── auditLog.service.js
│       ├── validators/
│       │   └── auth.validator.js
│       ├── utils/
│       │   ├── ApiError.js
│       │   ├── ApiResponse.js
│       │   ├── catchAsync.js
│       │   └── logger.js
│       ├── seeds/
│       │   └── seed.js
│       └── scripts/
│           └── create-admin.js
│
└── Frontend/
    ├── index.html                  # Landing / Home
    ├── manifest.json               # PWA manifest
    ├── sw.js                       # Service Worker
    ├── assets/
    │   ├── css/
    │   │   └── tokens.css          # Global design system tokens
    │   ├── js/
    │   │   ├── api.js              # Centralised API client (AuthAPI, BookingAPI, etc.)
    │   │   ├── auth.js             # Auth helpers (getToken, getUser, requireAuth)
    │   │   └── utils.js            # Toast, Loading, Format, Pagination helpers
    │   └── images/
    ├── css/
    │   └── style.css               # Global component styles
    ├── components/
    │   └── layout/
    │       └── navbar.js           # Shared navbar renderer
    └── pages/
        ├── auth.html / auth.js             # Sign In & Register
        ├── verify-otp.html / .js           # OTP Email Verification
        ├── forgot-password.html / .js      # Forgot Password request
        ├── reset-password.html / .js       # Reset Password (token from email)
        ├── change-password.html / .js      # Change Password (authenticated)
        ├── marketplace.html / .js          # Public marketplace with GPS discovery
        ├── farm-detail.html / .js          # Farm detail & booking page
        ├── dashboard-buyer.html / .js      # Buyer dashboard
        ├── dashboard-farm.html / .js       # Seller (Farm Owner) dashboard
        ├── dashboard-admin.html / .js      # Admin panel
        ├── about.html
        ├── why.html
        ├── terms.html
        └── privacy.html
```

---

## Features

### Buyer
- Register / Login with role-based redirect
- Browse verified poultry farms and egg depots by state, LGA, or GPS radius
- View farm details, product listings, and pricing
- Book crates with quantity selection
- Track bookings by status (Pending → Confirmed → Delivered / Cancelled)
- Cancel bookings (where applicable)
- Manage profile and change account password

### Seller (Farm Owner)
- Onboarding wizard for first-time sellers (business name, type, location, stock, price)
- Manage poultry farm profile (location, bio, delivery options)
- Create, edit, and delete product listings with images
- View and action incoming booking requests
- Inline inventory stock adjustments
- Full booking history with analytics overview

### Admin
- View all registered users with account status control (activate / deactivate)
- View audit logs (login events, failures, OTP activity)
- Platform-wide stats

### Security & Infrastructure
- JWT Access + Refresh token pair with automatic rotation
- Refresh token stored as `httpOnly` cookie (never accessible to JS)
- Argon2 password hashing (bcrypt fallback)
- Account lockout after 5 failed login attempts (15-minute cooldown)
- Rate limiting on authentication endpoints
- Helmet security headers with strict CSP
- Joi request validation on all mutating endpoints
- Audit logging for all sensitive auth events (login, logout, lockout, OTP)
- Anti-enumeration on forgot-password and resend-verification responses

---

## API Reference

All API routes are prefixed with `/api/v1` unless noted.

### Authentication — `/api/v1/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Create a new account |
| `POST` | `/login` | Public | Sign in, returns access token |
| `POST` | `/logout` | Protected | Clear refresh token |
| `POST` | `/refresh-token` | Public | Rotate and return new access token |
| `POST` | `/verify-otp` | Public | Verify 6-digit email OTP |
| `POST` | `/resend-otp` | Public | Resend OTP code |
| `GET` | `/verify-email/:token` | Public | Verify email via link token |
| `POST` | `/resend-verification` | Public | Resend verification link |
| `POST` | `/forgot-password` | Public | Request password reset email |
| `PATCH` | `/reset-password/:token` | Public | Set new password via reset token |
| `PATCH` | `/change-password` | Protected | Change password (authenticated) |
| `GET` | `/profile` | Protected | Get current user profile |
| `PATCH` | `/profile` | Protected | Update profile fields |

### Poultry — `/api/poultries`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/` | Public | List all poultry farms |
| `GET` | `/:id` | Public | Get single farm by ID |
| `POST` | `/` | Farm Owner | Create poultry farm profile |
| `PATCH` | `/:id` | Farm Owner | Update farm profile |

### Products — `/api/products`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/` | Public | List products (filterable by poultryId) |
| `GET` | `/:id` | Public | Get single product |
| `POST` | `/` | Farm Owner | Create product listing |
| `PATCH` | `/:id` | Farm Owner | Update product |
| `DELETE` | `/:id` | Farm Owner | Remove product |

### Search — `/api/search`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/poultries` | Public | Search farms by state, LGA, GPS radius, name, type |

### Bookings — `/api/bookings`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/` | Buyer | Create a booking |
| `GET` | `/my` | Buyer | Get my bookings |
| `GET` | `/farm` | Farm Owner | Get bookings for my farm |
| `GET` | `/:id` | Protected | Get booking by ID |
| `PATCH` | `/:id/status` | Farm Owner | Update booking status |
| `PATCH` | `/:id/cancel` | Buyer | Cancel a booking |

### Admin — `/api/v1/admin`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/users` | Admin | List all users |
| `PATCH` | `/users/:id/status` | Admin | Activate / Deactivate user |
| `GET` | `/audit-logs` | Admin | View audit log events |
| `GET` | `/stats` | Admin | Platform statistics |

---

## Authentication Flow

```
Register ──► Auto-verified (OTP suppressed) ──► Access + Refresh tokens issued
Login    ──► Password check + Lockout guard ──► Access + Refresh tokens issued
                                                ↓
                                     Refresh token (httpOnly cookie)
                                     Access token  (JS-accessible, short-lived)
                                                ↓
POST /refresh-token ──► Rotates both tokens on every refresh
```

> **Note:** The OTP verification flow (6-digit email code) is fully implemented in backend and frontend but is currently **suppressed** at registration (`isVerified: true`). To re-enable it, set `isVerified: false` in `auth.service.js` and uncomment the OTP dispatch block.

---

## Environment Variables

Create `Backend/src/.env` based on the following:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5000

# Email (Resend)
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=Egg Connect <noreply@eggconnect.app>
```

---

## Getting Started

### Prerequisites
- Node.js `>= 18.x`
- MongoDB Atlas account (or local MongoDB `>= 6.x`)
- Resend account for transactional email

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/egg-source-dev-app.git
cd egg-source-dev-app

# Install backend dependencies
cd Backend
npm install

# Create environment file
cp .env.example src/.env
# → Fill in your values (see Environment Variables above)
```

### Running the Development Server

```bash
# From the Backend directory
npm run dev
```

The server starts on `http://localhost:5000` and serves both the API and the Frontend static files from `/Frontend`.

| URL | Description |
|---|---|
| `http://localhost:5000` | Landing page |
| `http://localhost:5000/marketplace` | Public marketplace |
| `http://localhost:5000/login` | Sign in / Register |
| `http://localhost:5000/dashboard-buyer` | Buyer dashboard |
| `http://localhost:5000/dashboard-farm` | Seller dashboard |
| `http://localhost:5000/api/v1/health` | Health check endpoint |

---

## Database Seeding

To seed the database with sample farms, products, and a test buyer:

```bash
cd Backend
npm run seed
```

To create an admin account:

```bash
npm run create-admin
```

---

## Frontend Pages

| Route | Page | Auth Required |
|---|---|---|
| `/` | Home / Landing | No |
| `/marketplace` | Public Listings + GPS Map | No |
| `/farm-detail?farmId=` | Farm Detail & Book | No |
| `/login` | Sign In | No |
| `/register` | Sign Up | No |
| `/verify-otp` | OTP Verification | No |
| `/forgot-password` | Forgot Password | No |
| `/reset-password/:token` | Reset Password | No |
| `/change-password` | Change Password | ✅ Yes |
| `/dashboard-buyer` | Buyer Dashboard | ✅ Yes |
| `/dashboard-farm` | Seller Dashboard | ✅ Yes |
| `/dashboard-admin` | Admin Panel | ✅ Admin only |
| `/about` | About Egg Connect | No |
| `/why` | Why Egg Connect | No |
| `/terms` | Terms of Service | No |
| `/privacy` | Privacy Policy | No |

---

## Security

- **JWT tokens** — Short-lived access tokens (15m) + rotating refresh tokens stored in `httpOnly` secure cookies
- **Account lockout** — 5 failed login attempts triggers a 15-minute lockout
- **Rate limiting** — Auth endpoints are rate-limited to prevent brute-force
- **Helmet** — Full HTTP security headers including strict Content-Security-Policy
- **Joi validation** — All request bodies are validated against strict schemas before hitting controllers
- **Anti-enumeration** — Password reset and resend-verification always return success regardless of email existence
- **Audit logging** — All authentication events (success, failure, lockout, OTP) logged to MongoDB with IP and User-Agent




# Backend — Quick Commands

Run the development server:

```
npm run dev
```

Start the server in production:

```
npm start
```

Create the initial Super Admin (idempotent):

```
npm run create-admin
```

This command connects to the configured database and ensures a `SUPER_ADMIN` user exists. Use the `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` environment variables to control credentials.

📧 Email: farmowner@eggconnect.com
🔑 Password: Password123!
👤 Role: FARM_OWNER

---

## License

MIT © Ibrahim Oke — see [LICENSE](./LICENSE) for details.
