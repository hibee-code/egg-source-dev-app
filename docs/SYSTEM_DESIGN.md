# 🏛️ System Design & Architecture Specification

> **Project:** Egg Connect (`egg-source-dev-app`) 
> **Stack:** Node.js, Express 5, MongoDB / Mongoose v9, Argon2, JWT (HttpOnly Cookies), Resend SDK  

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Layered Component Design](#2-layered-component-design)
3. [Authentication & Security Lifecycle](#3-authentication--security-lifecycle)
4. [Concurrency & Race-Condition Mitigation](#4-concurrency--race-condition-mitigation)
5. [Reservation Expiration & Stock Recovery](#5-reservation-expiration--stock-recovery)
6. [Time-Slot Collision Prevention](#6-time-slot-collision-prevention)
7. [Error Handling & Resiliency Strategy](#7-error-handling--resiliency-strategy)

---

## 1. Architecture Overview

Egg Connect is architected as a **Modular Monolith** designed for high developer velocity, zero network hop latency between services, and simplified data consistency management across poultry farm inventories, user accounts, and direct crate bookings.

```
                              ┌────────────────────────┐
                              │  Frontend Application  │
                              │ (Vanilla JS / Web PWA) │
                              └───────────┬────────────┘
                                          │ HTTP / HTTPS (REST API)
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Express 5 Web Application Server                                                        │
│                                                                                        │
│  ┌─────────────────┐   ┌──────────────────────┐   ┌────────────────────────────────┐  │
│  │ Security Headers│   │   Cors / Cookie      │   │  Rate Limiter & Joi            │  │
│  │    (Helmet)     │──►│     Parser           │──►│  Validation Middleware         │  │
│  └─────────────────┘   └──────────────────────┘   └────────────────────────────────┘  │
│                                                                  │                     │
│                                                                  ▼                     │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Controller Layer (HTTP Request Lifecycle & Response Formatting)                  │  │
│  └─────────────────────────────────────────┬────────────────────────────────────────┘  │
│                                            │                                           │
│                                            ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Service Domain Layer (Business Logic, Concurrency Locks, Auth Lifecycle)         │  │
│  └─────────────────────────────────────────┬────────────────────────────────────────┘  │
│                                            │                                           │
│                                            ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Repository Layer (Data Access Abstraction & Mongoose Atomic Queries)             │  │
│  └─────────────────────────────────────────┬────────────────────────────────────────┘  │
└────────────────────────────────────────────┼───────────────────────────────────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │     MongoDB Database      │
                               │  (Document Collections)   │
                               └───────────────────────────┘
```

---

## 2. Layered Component Design

The application strictly separates responsibilities into four primary architectural tiers:

1. **Routing & Validation Tier (`/routes`, `/middleware`, `/validators`)**:
   - Enforces rate limiting on authentication routes.
   - Validates incoming HTTP payloads against Joi schemas before hitting controllers.
   - Applies JWT token verification (`protect`) and Role-Based Access Control (`restrictTo`).

2. **Controller Tier (`/controllers`)**:
   - Parses HTTP parameters, headers, and query parameters.
   - Delegates business domain execution to the service tier.
   - Formats responses using standardized `ApiResponse` structures.

3. **Service Tier (`/services`)**:
   - Contains core domain workflows (booking checkout, stock validation, password hashing, token issuance).
   - Manages race condition locks, snapshot embedding, and transaction rollbacks.

4. **Repository Tier (`/repositories`)**:
   - Encapsulates database queries and schema methods.
   - Provides atomic update primitives (`decrementStock`, `incrementStock`, `findExpiredPendingReservations`).

---

## 3. Authentication & Security Lifecycle

Authentication uses a **Dual JWT Token Pattern** combined with **Argon2 Password Hashing** and an advanced **Token Rotation Grace Period** to support concurrent client requests without force-logging out users.

```
                          ┌──────────────────────────┐
                          │   POST /api/v1/auth/login│
                          └─────────────┬────────────┘
                                        │
                                        ▼
                         ┌────────────────────────────┐
                         │ Validate Credentials &     │
                         │ Failed Attempt Lockout Guard│
                         └─────────────┬──────────────┘
                                       │
                                       ▼
                         ┌────────────────────────────┐
                         │ Issue JWT Token Pair       │
                         │ • Access Token (15m, JSON) │
                         │ • Refresh Token (7d, Cookie)│
                         └─────────────┬──────────────┘
                                       │
                                       ▼
                       ┌────────────────────────────────┐
                       │ POST /api/v1/auth/refresh-token│
                       └───────────────┬────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                │                                             │
                ▼                                             ▼
    Current Token Match?                      Previous Token within 30s Grace Period?
     (Normal Rotation)                              (Concurrent Request)
                │                                             │
                ▼                                             ▼
  • Move Current Hash -> Previous               • Issue new short-lived Access Token
  • Issue New Refresh Token                     • Preserve active Refresh Cookie
  • Set refreshTokenRotatedAt = Now             • Skip duplicate rotation
```

### Key Security Implementations:
- **Refresh Token Storage**: Stored as a hashed digest (`sha256`) in MongoDB and sent to the client exclusively via `httpOnly`, `sameSite: strict` HTTP cookies.
- **Concurrent Request Grace Window**: Solves single-token rotation invalidation when frontend applications fire multiple parallel calls with an expired access token.
- **Account Lockout Protection**: Locks accounts for 15 minutes after 5 consecutive failed login attempts, tracked atomically in `User` documents.

---

## 4. Concurrency & Race-Condition Mitigation

In poultry & egg sourcing marketplaces, high-demand crate items run the risk of overselling when multiple buyers attempt simultaneous purchases.

### Race Condition Mitigation Algorithm:
Instead of standard **Read-Then-Update** pattern (which permits race condition overselling):
```javascript
// ❌ VULNERABLE READ-THEN-UPDATE
const product = await Product.findById(id);
if (product.stockQuantity >= requested) {
  product.stockQuantity -= requested;
  await product.save();
}
```

Egg Connect uses **Atomic Conditionally-Filtered Decrements** directly in MongoDB:
```javascript
// ✅ ATOMIC RACE-CONDITION-SAFE DECREMENT
const updatedProduct = await Product.findOneAndUpdate(
  { _id: id, isAvailable: true, stockQuantity: { $gte: quantity } },
  { $inc: { stockQuantity: -quantity } },
  { new: true, runValidators: true }
);

if (!updatedProduct) {
  throw ApiError.badRequest("Insufficient stock available or item was reserved by another buyer.");
}
```

### Rollback Guarantee:
If subsequent booking document creation fails (e.g. database validation error or unique constraint violation), an atomic `$inc` stock restoration is immediately triggered:
```javascript
await Product.findOneAndUpdate(
  { _id: productId },
  { $inc: { stockQuantity: quantity } }
);
```

---

## 5. Reservation Expiration & Stock Recovery

To prevent abandoned checkouts from permanently locking up perishable farm inventory, pending bookings are bound by a **Reservation TTL Strategy**.

```
[ Booking Created ] ──► Status: "Pending" | reservationExpiresAt: Now + 15 mins
         │
         ├──► Buyer Completes Payment/Confirmation ──► Status: "Confirmed" | reservationExpiresAt: null
         │
         └──► Expiration Window Reached (Unpaid) ────► releaseExpiredReservations() Worker
                                                              │
                                                              ▼
                                                   • Status updated to "Cancelled"
                                                   • Stock restored (+quantity via $inc)
```

1. Each pending booking receives a 15-minute expiration threshold (`reservationExpiresAt`).
2. The `releaseExpiredReservations()` worker executes automatically during checkout and booking query lifecycles, identifying all expired pending reservations and returning their reserved quantities to the active stock pool.

---

## 6. Time-Slot Collision Prevention

For scheduled farm visits, pickup windows, or veterinary consultations, time-slot collisions are prevented at the database kernel level using a **Partial Unique Compound Index**:

```javascript
bookingSchema.index(
  { poultryId: 1, "scheduledSlot.slotDate": 1, "scheduledSlot.timeSlot": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "scheduledSlot.slotDate": { $exists: true, $ne: null },
      "scheduledSlot.timeSlot": { $exists: true, $ne: null },
      status: { $ne: "Cancelled" },
    },
  }
);
```

This guarantees that even under parallel HTTP request floods targeting the same farm and time slot, MongoDB will strictly accept only **one** reservation document and reject duplicates with code `11000`.

---

## 7. Error Handling & Resiliency Strategy

- **Centralized Error Middleware**: All application errors are routed through a unified global error handler formatting responses to `ApiResponse.error(statusCode, message)`.
- **Async Handling (`catchAsync`)**: Wraps Express routes to catch unhandled promise rejections automatically.
- **Audit Logging**: Sensitive authentication and authorization state changes (login failures, account lockouts, OTP verifications) are recorded asynchronously to an immutable `AuditLog` collection.
