# 🗄️ Database Design & Schema Specification

> **Project:** Egg Connect (`egg-source-dev-app`)  
> **Role:** Senior Database Architect / Lead Backend Engineer Specification  
> **Database Management System:** MongoDB (Document-Oriented NoSQL) via Mongoose ORM  

---

## Table of Contents
1. [Database Architectural Strategy](#1-database-architectural-strategy)
2. [Entity Relationship Overview](#2-entity-relationship-overview)
3. [Collection Schemas & Data Types](#3-collection-schemas--data-types)
   - [Users Collection (`users`)](#users-collection-users)
   - [Poultry Farms Collection (`poultries`)](#poultry-farms-collection-poultries)
   - [Products Collection (`products`)](#products-collection-products)
   - [Bookings Collection (`bookings`)](#bookings-collection-bookings)
   - [Audit Logs Collection (`auditlogs`)](#audit-logs-collection-auditlogs)
4. [Indexing & Query Optimization Strategy](#4-indexing--query-optimization-strategy)
5. [Data Snapshotting & Audit Drift Mitigation](#5-data-snapshotting--audit-drift-mitigation)

---

## 1. Database Architectural Strategy

Egg Connect uses a **Hybrid Schema Architecture** combining normalized relational references (`ObjectId` refs) with embedded subdocuments and snapshots:

- **Normalized References**: Used for volatile or independent entities (e.g. `buyerId` referencing `User`, `poultryId` referencing `Poultry`).
- **Embedded Snapshots**: Used for historical transactional data (e.g. `productSnapshot` within `Booking`) to isolate orders from upstream price changes or seller modifications.
- **Geospatial Indexes**: MongoDB 2D Sphere indexes on `2dsphere` coordinates to enable location-based farm discovery by state, LGA, or GPS radius.

---

## 2. Entity Relationship Overview

```
 ┌──────────────────────┐               ┌──────────────────────────┐
 │        User          │ 1           * │         Poultry          │
 │ (Sellers / Buyers)   ├───────────────┤   (Farms / Depots)       │
 └──────────┬───────────┘               └────────────┬─────────────┘
            │ 1                                      │ 1
            │                                        │
            │ *                                      │ *
 ┌──────────┴───────────┐               ┌────────────┴─────────────┐
 │       Booking        │ *           1 │         Product          │
 │ (Orders & Snapshots) ├───────────────┤ (Egg Crates / Poultry)   │
 └──────────────────────┘               └──────────────────────────┘
```

---

## 3. Collection Schemas & Data Types

### Users Collection (`users`)

Stores account profiles, credentials, role permissions, and security metadata.

| Field | Type | Validation & Constraints | Description |
|---|---|---|---|
| `_id` | `ObjectId` | Primary Key (Auto) | Unique user identifier |
| `firstName` | `String` | Required, trim, max 50 chars | User's first name |
| `lastName` | `String` | Required, trim, max 50 chars | User's last name |
| `email` | `String` | Required, unique, lowercase | Account email address |
| `phone` | `String` | Trim, default: `""` | Contact phone number |
| `password` | `String` | Required, min 8 chars, `select: false` | Argon2/Bcrypt hashed password |
| `role` | `String` | Enum: `["CUSTOMER", "FARM_OWNER", "SUPER_ADMIN"]` | Authorization role |
| `failedLoginAttempts` | `Number` | Default: `0` | Consecutive failed logins |
| `lockoutUntil` | `Date` | Optional | Account lockout expiry |
| `refreshTokenHash` | `String` | `select: false` | Hashed current refresh token |
| `previousRefreshTokenHash` | `String` | `select: false` | Hashed token for 30s grace period |
| `refreshTokenRotatedAt` | `Date` | `select: false` | Rotation timestamp |
| `isVerified` | `Boolean` | Default: `false` | Email verification flag |
| `isActive` | `Boolean` | Default: `true` | Account active state |
| `lastLoginLocation` | `GeoJSON Point` | `2dsphere` index | Geo coordinates of last login |
| `signupLocation` | `GeoJSON Point` | `2dsphere` index | Geo coordinates at registration |

---

### Poultry Farms Collection (`poultries`)

Stores verified farm profiles, location data, and seller business metrics.

| Field | Type | Validation & Constraints | Description |
|---|---|---|---|
| `_id` | `ObjectId` | Primary Key (Auto) | Unique farm identifier |
| `ownerId` | `ObjectId` | Ref: `User`, Required | Seller account owner |
| `businessName` | `String` | Required, trim | Registered farm/depot name |
| `businessType` | `String` | Enum: `["Poultry Farm", "Egg Depot", "Wholesaler", "Retailer"]` | Business category |
| `description` | `String` | Default: `""` | Farm bio / operational details |
| `location` | `Object` | Embedded | State, LGA, Street Address |
| `coordinates` | `GeoJSON Point` | `2dsphere` index | `[longitude, latitude]` for maps |
| `isVerified` | `Boolean` | Default: `false` | Admin verification badge |

---

### Products Collection (`products`)

Stores live inventory items offered by poultry farms.

| Field | Type | Validation & Constraints | Description |
|---|---|---|---|
| `_id` | `ObjectId` | Primary Key (Auto) | Unique product identifier |
| `poultryId` | `ObjectId` | Ref: `Poultry`, Required, Index | Owning poultry farm |
| `productName` | `String` | Required, trim | Item title (e.g. Large Egg Crates) |
| `category` | `String` | Required, trim, Index | Category (e.g. Eggs, Broilers) |
| `pricePerCrate` | `Number` | Required, min: `0`, Index | Price per unit crate in NGN |
| `stockQuantity` | `Number` | Required, min: `0` | Available stock crates |
| `imageUrl` | `String` | Default: `""` | Product asset URL |
| `isAvailable` | `Boolean` | Default: `true` | Listing availability flag |

---

### Bookings Collection (`bookings`)

Stores crate reservations, calculated financial breakdowns, and immutable product snapshots.

| Field | Type | Validation & Constraints | Description |
|---|---|---|---|
| `_id` | `ObjectId` | Primary Key (Auto) | Unique booking identifier |
| `buyerId` | `ObjectId` | Ref: `User`, Required, Index | Buyer user reference |
| `poultryId` | `ObjectId` | Ref: `Poultry`, Required, Index | Farm owner reference |
| `productId` | `ObjectId` | Ref: `Product`, Required, Index | Product reference |
| `quantity` | `Number` | Required, min: `1` | Ordered crate quantity |
| `pricePerCrate` | `Number` | Required, min: `0` | Unit price at transaction |
| `subtotal` | `Number` | Required, min: `0` | `pricePerCrate * quantity` |
| `shippingFee` | `Number` | Default: `0` | Delivery charge in NGN |
| `serviceFee` | `Number` | Default: `0` | Platform service fee (2.5%) |
| `totalAmount` | `Number` | Required, min: `0` | Total order cost in NGN |
| `deliveryMethod` | `String` | Enum: `["pickup", "delivery"]` | Fulfillment method |
| `productSnapshot` | `Object` | Embedded Subdocument | Immutable snapshot of item & farm |
| `scheduledSlot` | `Object` | Optional (`slotDate`, `timeSlot`) | Scheduled visit/pickup slot |
| `reservationExpiresAt` | `Date` | Indexed | 15-minute TTL release timer |
| `status` | `String` | Enum: `["Pending", "Confirmed", "In Transit", "Delivered", "Cancelled"]` | Order lifecycle status |

---

### Audit Logs Collection (`auditlogs`)

Stores security events, login attempts, and authentication failures.

| Field | Type | Validation & Constraints | Description |
|---|---|---|---|
| `_id` | `ObjectId` | Primary Key (Auto) | Unique log entry identifier |
| `userId` | `ObjectId` | Ref: `User`, Optional | Associated user account |
| `action` | `String` | Required, Index | Event code (e.g. `USER_LOGIN_FAILED`) |
| `ipAddress` | `String` | Required | Request IP address |
| `userAgent` | `String` | Default: `""` | Client browser user agent |
| `severity` | `String` | Enum: `["INFO", "WARNING", "CRITICAL"]` | Event severity level |
| `metadata` | `Object` | Additional contextual data | Custom event payload |

---

## 4. Indexing & Query Optimization Strategy

Indexes are systematically added to accelerate frequent read paths and enforce data integrity constraints:

```javascript
// 1. Geospatial Map & Marketplace Discovery
userSchema.index({ lastLoginLocation: "2dsphere" });
userSchema.index({ signupLocation: "2dsphere" });
poultrySchema.index({ coordinates: "2dsphere" });

// 2. Product Search & Filter Speedup
productSchema.index({ poultryId: 1 });
productSchema.index({ category: 1 });
productSchema.index({ pricePerCrate: 1 });

// 3. Booking Status & Reservation Expiration Scanner
bookingSchema.index({ buyerId: 1 });
bookingSchema.index({ poultryId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ status: 1, reservationExpiresAt: 1 });

// 4. Time-Slot Collision Lock (Partial Compound Unique Index)
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

---

## 5. Data Snapshotting & Audit Drift Mitigation

When a seller edits a product title or price, existing historical orders must remain uncorrupted for accounting and legal integrity.

Egg Connect resolves historical data drift by creating an embedded **Snapshot Object** at the instant of order placement:

```json
{
  "_id": "66b4f123a1c8900012e45678",
  "buyerId": "66b4f0001234567890abcdef",
  "productId": "66b4f9998887776665554443",
  "quantity": 50,
  "totalAmount": 128125,
  "productSnapshot": {
    "productName": "Jumbo Farm Fresh Egg Crates",
    "category": "Eggs",
    "farmName": "Golden Yolk Farms Ltd",
    "farmLocation": "Ibadan, Oyo State"
  },
  "status": "Confirmed"
}
```

Even if `Product` document `66b4f999...` is later updated or deleted, the `Booking` document preserves the exact product name, category, and seller location as presented at checkout.
