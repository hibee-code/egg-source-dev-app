const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/user.model");
const Poultry = require("../models/poultry.model");
const Product = require("../models/product.model");
const logger = require("../utils/logger");

const seedData = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Clear Existing Data
    logger.info("Clearing existing poultry and product data...");
    await Poultry.deleteMany({});
    await Product.deleteMany({});

    // 3. Create or Find Seed Owner (FARM_OWNER)
    let owner = await User.findOne({ email: "farmowner@eggsource.com" });
    if (!owner) {
      logger.info("Creating default seed farm owner...");
      owner = await User.create({
        firstName: "Seed",
        lastName: "Farm Owner",
        email: "farmowner@eggsource.com",
        password: "Password123!", // pre-save will hash this
        role: "FARM_OWNER",
        phone: "+2348000000000",
        isVerified: true,
        isActive: true,
      });
    } else {
      owner.role = "FARM_OWNER";
      owner.isVerified = true;
      owner.isActive = true;
      await owner.save({ validateBeforeSave: false });
    }

    // 4. Poultry Farms Dataset
    const poultryFarms = [
      // ── LAGOS STATE ──
      {
        businessName: "Lekki Golden Feathers",
        state: "Lagos",
        lga: "Eti-Osa",
        address: "Plot 15, Admiralty Way, Lekki Phase 1",
        phoneNumber: "+2348011112222",
        description: "Premium organic eggs and day-old chicks available daily.",
        deliveryAvailable: true,
        rating: 4.8,
        location: { type: "Point", coordinates: [3.4833, 6.4281] }, // [longitude, latitude]
      },
      {
        businessName: "Ikeja Poultry Hub",
        state: "Lagos",
        lga: "Ikeja",
        address: "24, Allen Avenue, Ikeja",
        phoneNumber: "+2348022223333",
        description: "Fresh farm eggs and high-grade poultry feeds.",
        deliveryAvailable: true,
        rating: 4.5,
        location: { type: "Point", coordinates: [3.3421, 6.6018] },
      },
      {
        businessName: "Surulere Egg Basket",
        state: "Lagos",
        lga: "Surulere",
        address: "12, Adeniran Ogunsanya Street, Surulere",
        phoneNumber: "+2348033334444",
        description: "Your local source for affordable crates of eggs.",
        deliveryAvailable: false,
        rating: 4.2,
        location: { type: "Point", coordinates: [3.3614, 6.5003] },
      },
      {
        businessName: "Ikorodu Valley Poultry",
        state: "Lagos",
        lga: "Ikorodu",
        address: "88, Sagamu Road, Ikorodu",
        phoneNumber: "+2348044445555",
        description: "Massive scale production of eggs and point-of-lay pullets.",
        deliveryAvailable: true,
        rating: 4.6,
        location: { type: "Point", coordinates: [3.5101, 6.6149] },
      },
      {
        businessName: "Epe Lagoon Farms",
        state: "Lagos",
        lga: "Epe",
        address: "5, Marina Road, Epe",
        phoneNumber: "+2348055556666",
        description: "Naturally raised poultry products on the edge of the lagoon.",
        deliveryAvailable: true,
        rating: 4.7,
        location: { type: "Point", coordinates: [3.9834, 6.5841] },
      },
      {
        businessName: "Yaba Tech Farms",
        state: "Lagos",
        lga: "Lagos Mainland",
        address: "Herbert Macaulay Way, Yaba",
        phoneNumber: "+2348066667777",
        description: "Academic standard poultry breeding and egg supplies.",
        deliveryAvailable: false,
        rating: 4.0,
        location: { type: "Point", coordinates: [3.3792, 6.5244] },
      },
      {
        businessName: "Victoria Island Broilers",
        state: "Lagos",
        lga: "Eti-Osa",
        address: "Plot 9, Adeola Odeku Street, Victoria Island",
        phoneNumber: "+2348077778888",
        description: "Gourmet poultry products for premium consumers.",
        deliveryAvailable: true,
        rating: 4.9,
        location: { type: "Point", coordinates: [3.4244, 6.4281] },
      },
      {
        businessName: "Maryland Chickens",
        state: "Lagos",
        lga: "Kosofe",
        address: "14, Ikorodu Road, Maryland",
        phoneNumber: "+2348088889999",
        description: "Fresh farm chickens and organic eggs.",
        deliveryAvailable: true,
        rating: 4.3,
        location: { type: "Point", coordinates: [3.3721, 6.5802] },
      },
      {
        businessName: "Festac Egg Supreme",
        state: "Lagos",
        lga: "Amuwo-Odofin",
        address: "2nd Avenue, Festac Town",
        phoneNumber: "+2348099990000",
        description: "Top-quality egg supply and broiler processing.",
        deliveryAvailable: true,
        rating: 4.4,
        location: { type: "Point", coordinates: [3.2844, 6.4682] },
      },
      {
        businessName: "Badagry Organic Farms",
        state: "Lagos",
        lga: "Badagry",
        address: "21, Joseph Dosu Way, Badagry",
        phoneNumber: "+2348012345678",
        description: "100% organic poultry and egg production.",
        deliveryAvailable: false,
        rating: 4.1,
        location: { type: "Point", coordinates: [2.8834, 6.4244] },
      },

      // ── OGUN STATE (ABEOKUTA) ──
      {
        businessName: "Abeokuta North Poultry",
        state: "Ogun",
        lga: "Abeokuta North",
        address: "Lafenwa Market Road, Abeokuta",
        phoneNumber: "+2348111112222",
        description: "Leading egg suppliers in Abeokuta North.",
        deliveryAvailable: true,
        rating: 4.5,
        location: { type: "Point", coordinates: [3.3294, 7.1994] },
      },
      {
        businessName: "RockCity Poultry Palace",
        state: "Ogun",
        lga: "Abeokuta South",
        address: "Oke-Yeke, Abeokuta South",
        phoneNumber: "+2348122223333",
        description: "Quality broilers and eggs from the rock city.",
        deliveryAvailable: true,
        rating: 4.7,
        location: { type: "Point", coordinates: [3.3483, 7.1475] },
      },
      {
        businessName: "Obantoko Egg Masters",
        state: "Ogun",
        lga: "Odeda",
        address: "Opposite FUNAAB road, Obantoko",
        phoneNumber: "+2348133334444",
        description: "Affordable eggs for students and residents.",
        deliveryAvailable: false,
        rating: 4.3,
        location: { type: "Point", coordinates: [3.4333, 7.1667] },
      },
      {
        businessName: "Oke-Mosan Royal Broilers",
        state: "Ogun",
        lga: "Abeokuta South",
        address: "Governor's Office Road, Oke-Mosan",
        phoneNumber: "+2348144445555",
        description: "Royal quality poultry products for all functions.",
        deliveryAvailable: true,
        rating: 4.6,
        location: { type: "Point", coordinates: [3.3654, 7.1189] },
      },
      {
        businessName: "Ita-Oshin Feeds & Farms",
        state: "Ogun",
        lga: "Abeokuta North",
        address: "Ita-Oshin Expressway, Abeokuta",
        phoneNumber: "+2348155556666",
        description: "One stop shop for feeds, chicks, and eggs.",
        deliveryAvailable: true,
        rating: 4.4,
        location: { type: "Point", coordinates: [3.2984, 7.1823] },
      },
      {
        businessName: "Kemta Poultry Palace",
        state: "Ogun",
        lga: "Abeokuta South",
        address: "Kemta Housing Estate, Abeokuta",
        phoneNumber: "+2348166667777",
        description: "High quality table eggs and healthy birds.",
        deliveryAvailable: false,
        rating: 4.2,
        location: { type: "Point", coordinates: [3.3512, 7.1321] },
      },
      {
        businessName: "Idi-Aba Fresh Eggs",
        state: "Ogun",
        lga: "Abeokuta South",
        address: "Idi-Aba Road, Abeokuta",
        phoneNumber: "+2348177778888",
        description: "Freshly collected daily eggs for wholesale and retail.",
        deliveryAvailable: true,
        rating: 4.5,
        location: { type: "Point", coordinates: [3.3822, 7.1511] },
      },

      // ── OYO STATE (IBADAN) ──
      {
        businessName: "Ibadan North Poultry",
        state: "Oyo",
        lga: "Ibadan North",
        address: "UI-Ojoo Road, Ibadan",
        phoneNumber: "+2348211112222",
        description: "Premium eggs sourced from healthy layers.",
        deliveryAvailable: true,
        rating: 4.6,
        location: { type: "Point", coordinates: [3.9167, 7.4167] },
      },
      {
        businessName: "Ibadan Southwest Egg Kings",
        state: "Oyo",
        lga: "Ibadan South West",
        address: "Ring Road, near Challenge, Ibadan",
        phoneNumber: "+2348222223333",
        description: "The biggest egg distributor in Southwest Ibadan.",
        deliveryAvailable: true,
        rating: 4.8,
        location: { type: "Point", coordinates: [3.8667, 7.3500] },
      },
      {
        businessName: "Ibadan Northeast Chicks",
        state: "Oyo",
        lga: "Ibadan North East",
        address: "Iwo Road, Ibadan",
        phoneNumber: "+2348233334444",
        description: "Specialized in day-old chicks and poultry equipment.",
        deliveryAvailable: true,
        rating: 4.4,
        location: { type: "Point", coordinates: [3.9333, 7.3833] },
      },
      {
        businessName: "Ibadan Northwest Layers",
        state: "Oyo",
        lga: "Ibadan North West",
        address: "Eleyele Road, Ibadan",
        phoneNumber: "+2348244445555",
        description: "Excellent egg layer management and organic feeds.",
        deliveryAvailable: false,
        rating: 4.2,
        location: { type: "Point", coordinates: [3.8833, 7.4000] },
      },
      {
        businessName: "Bodija Market Eggs",
        state: "Oyo",
        lga: "Ibadan North",
        address: "Bodija Market, Ibadan",
        phoneNumber: "+2348255556666",
        description: "Direct wholesale prices for crates of eggs.",
        deliveryAvailable: true,
        rating: 4.5,
        location: { type: "Point", coordinates: [3.9142, 7.4358] },
      },
      {
        businessName: "RingRoad Feeds and Broilers",
        state: "Oyo",
        lga: "Ibadan South West",
        address: "Mobil, Ring Road, Ibadan",
        phoneNumber: "+2348266667777",
        description: "Healthy broiler birds and top quality starter feeds.",
        deliveryAvailable: true,
        rating: 4.6,
        location: { type: "Point", coordinates: [3.8542, 7.3458] },
      },
      {
        businessName: "Akobo Valley Poultry",
        state: "Oyo",
        lga: "Ibadan North East",
        address: "Akobo Road, Ibadan",
        phoneNumber: "+2348277778888",
        description: "Scenic valley farm producing organic fresh eggs.",
        deliveryAvailable: true,
        rating: 4.7,
        location: { type: "Point", coordinates: [3.9642, 7.4458] },
      },
      {
        businessName: "Samonda Fresh Farm",
        state: "Oyo",
        lga: "Ibadan North",
        address: "Samonda Road, Ibadan",
        phoneNumber: "+2348288889999",
        description: "Direct sales of day-old chicks and point of lay birds.",
        deliveryAvailable: false,
        rating: 4.1,
        location: { type: "Point", coordinates: [3.8942, 7.4258] },
      },
      {
        businessName: "Challenge Junction Poultry",
        state: "Oyo",
        lga: "Ibadan South West",
        address: "Challenge Junction, Ibadan",
        phoneNumber: "+2348299990000",
        description: "Fast delivery of fresh eggs across Ibadan city.",
        deliveryAvailable: true,
        rating: 4.5,
        location: { type: "Point", coordinates: [3.8742, 7.3358] },
      },
    ];

    // 5. Insert Poultry Farms & Generate Products for each
    logger.info(`Inserting ${poultryFarms.length} poultry farms...`);

    for (const farmInfo of poultryFarms) {
      const poultry = await Poultry.create({
        ...farmInfo,
        ownerId: owner._id,
      });

      // Generate 2-3 products per poultry
      const products = [
        {
          poultryId: poultry._id,
          productName: "Fresh Organic Eggs",
          category: "Eggs",
          pricePerCrate: Math.floor(Math.random() * (2800 - 1800 + 1)) + 1800, // 1800 to 2800
          stockQuantity: Math.floor(Math.random() * 400) + 50, // 50 to 450
          imageUrl: "https://images.unsplash.com/photo-1516448424440-9dbca97779c1",
          isAvailable: true,
        },
        {
          poultryId: poultry._id,
          productName: "Day-Old Chicks (Pullets)",
          category: "Chicks",
          pricePerCrate: Math.floor(Math.random() * (850 - 450 + 1)) + 450, // 450 to 850
          stockQuantity: Math.floor(Math.random() * 1000) + 100, // 100 to 1100
          imageUrl: "https://images.unsplash.com/photo-1604848698030-c434ba08eca1",
          isAvailable: true,
        },
        {
          poultryId: poultry._id,
          productName: "Premium Layer Feed (25kg)",
          category: "Feed",
          pricePerCrate: Math.floor(Math.random() * (14000 - 9000 + 1)) + 9000, // 9000 to 14000
          stockQuantity: Math.floor(Math.random() * 80) + 10, // 10 to 90
          imageUrl: "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46",
          isAvailable: Math.random() > 0.15, // 85% availability chance
        },
      ];

      await Product.insertMany(products);
    }

    logger.info("🎉 Database successfully seeded with Poultry Farms and Products!");
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
