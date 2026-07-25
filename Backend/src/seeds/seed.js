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

    // 2. Sync Logic (Preserves existing DB data)
    logger.info("Syncing seed poultry and product data without wiping existing database items...");

    // 3. Create or Update Default Seed Farm Owner
    let owner = await User.findOne({ email: "farmowner@eggconnect.com" });
    if (!owner) {
      logger.info("Creating default seed farm owner...");
      owner = await User.create({
        firstName: "Seed",
        lastName: "Farm Owner",
        email: "farmowner@eggconnect.com",
        password: "Password123!",
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

    // 4. Poultry Farms Dataset (20 Real-World Locations across Lagos, Oyo & Ogun)
    const poultryFarms = [
      // ── LAGOS STATE (10 Farms / Depots) ──
      {
        businessName: "Lekki Golden Feathers",
        state: "Lagos",
        lga: "Eti-Osa",
        address: "Plot 15, Admiralty Way, Lekki Phase 1, Lagos",
        phoneNumber: "+2348011112222",
        description: "Premium organic table eggs and day-old chicks available daily.",
        deliveryAvailable: true,
        rating: 4.8,
        location: { type: "Point", coordinates: [3.4735, 6.4474] }, // [longitude, latitude]
      },
      {
        businessName: "Ikeja Poultry Hub",
        state: "Lagos",
        lga: "Ikeja",
        address: "24, Allen Avenue, Ikeja, Lagos",
        phoneNumber: "+2348022223333",
        description: "Fresh farm eggs and high-grade poultry feeds distributor.",
        deliveryAvailable: true,
        rating: 4.5,
        location: { type: "Point", coordinates: [3.3541, 6.6018] },
      },
      {
        businessName: "Surulere Egg Basket",
        state: "Lagos",
        lga: "Surulere",
        address: "12, Adeniran Ogunsanya Street, Surulere, Lagos",
        phoneNumber: "+2348033334444",
        description: "Your reliable neighborhood source for fresh crates of eggs.",
        deliveryAvailable: false,
        rating: 4.2,
        location: { type: "Point", coordinates: [3.3592, 6.4947] },
      },
      {
        businessName: "Ikorodu Valley Poultry",
        state: "Lagos",
        lga: "Ikorodu",
        address: "88, Sagamu Road, Ikorodu, Lagos",
        phoneNumber: "+2348044445555",
        description: "Commercial scale production of table eggs and point-of-lay pullets.",
        deliveryAvailable: true,
        rating: 4.6,
        location: { type: "Point", coordinates: [3.5101, 6.6149] },
      },
      {
        businessName: "Epe Agro Lagoon Farms",
        state: "Lagos",
        lga: "Epe",
        address: "Kilometer 5, Epe-Ijebu Ode Road, Epe, Lagos",
        phoneNumber: "+2348055556666",
        description: "Naturally raised poultry products on the fertile edge of the lagoon.",
        deliveryAvailable: true,
        rating: 4.7,
        location: { type: "Point", coordinates: [3.9834, 6.5841] },
      },
      {
        businessName: "Yaba Central Egg Depot",
        state: "Lagos",
        lga: "Lagos Mainland",
        address: "210, Herbert Macaulay Way, Yaba, Lagos",
        phoneNumber: "+2348066667777",
        description: "Wholesale egg depot serving mainland restaurants and retailers.",
        deliveryAvailable: true,
        rating: 4.3,
        location: { type: "Point", coordinates: [3.3792, 6.5085] },
      },
      {
        businessName: "Victoria Island Broilers & Eggs",
        state: "Lagos",
        lga: "Eti-Osa",
        address: "Plot 9, Adeola Odeku Street, Victoria Island, Lagos",
        phoneNumber: "+2348077778888",
        description: "Gourmet free-range eggs and fresh dressed broilers for premium consumers.",
        deliveryAvailable: true,
        rating: 4.9,
        location: { type: "Point", coordinates: [3.4244, 6.4281] },
      },
      {
        businessName: "Maryland Poultry Store",
        state: "Lagos",
        lga: "Kosofe",
        address: "14, Ikorodu Road, Maryland, Lagos",
        phoneNumber: "+2348088889999",
        description: "Fresh daily farm eggs and organic poultry supplies.",
        deliveryAvailable: true,
        rating: 4.4,
        location: { type: "Point", coordinates: [3.3685, 6.5683] },
      },
      {
        businessName: "Festac Egg Supreme",
        state: "Lagos",
        lga: "Amuwo-Odofin",
        address: "Plot 42, 2nd Avenue, Festac Town, Lagos",
        phoneNumber: "+2348099990000",
        description: "Top-quality egg distribution and broiler processing depot.",
        deliveryAvailable: true,
        rating: 4.4,
        location: { type: "Point", coordinates: [3.2844, 6.4682] },
      },
      {
        businessName: "Alimosho Farm Direct",
        state: "Lagos",
        lga: "Alimosho",
        address: "45, Idimu Road, Egbeda, Alimosho, Lagos",
        phoneNumber: "+2348012345678",
        description: "Direct farm-to-consumer crates of eggs at affordable prices.",
        deliveryAvailable: false,
        rating: 4.1,
        location: { type: "Point", coordinates: [3.2682, 6.5925] },
      },

      // ── OYO STATE (5 Farms / Depots) ──
      {
        businessName: "Bodija Central Egg Depot",
        state: "Oyo",
        lga: "Ibadan North",
        address: "Block B, Bodija International Market, Ibadan North, Oyo State",
        phoneNumber: "+2348211112222",
        description: "Major wholesale egg hub at Bodija Market with nationwide supply routes.",
        deliveryAvailable: true,
        rating: 4.8,
        location: { type: "Point", coordinates: [3.9142, 7.4358] },
      },
      {
        businessName: "UI Agro Research Poultry",
        state: "Oyo",
        lga: "Ibadan North",
        address: "Teaching & Research Farm, University of Ibadan, Ojoo-UI Road, Ibadan, Oyo State",
        phoneNumber: "+2348222223333",
        description: "Scientific breeding and high-yield organic layer egg production.",
        deliveryAvailable: true,
        rating: 4.7,
        location: { type: "Point", coordinates: [3.8992, 7.4435] },
      },
      {
        businessName: "Ring Road Egg Kings",
        state: "Oyo",
        lga: "Ibadan South West",
        address: "105, Ring Road, Opposite Mobil Station, Challenge, Ibadan, Oyo State",
        phoneNumber: "+2348233334444",
        description: "Leading egg distributor serving eateries and hotels across Ring Road.",
        deliveryAvailable: true,
        rating: 4.6,
        location: { type: "Point", coordinates: [3.8667, 7.3500] },
      },
      {
        businessName: "Iwo Road Poultry Hub",
        state: "Oyo",
        lga: "Ibadan North East",
        address: "18, Iwo Road Commercial Complex, Ibadan North-East, Oyo State",
        phoneNumber: "+2348244445555",
        description: "Specialized in bulk egg logistics, day-old chicks, and feeds.",
        deliveryAvailable: true,
        rating: 4.4,
        location: { type: "Point", coordinates: [3.9333, 7.3833] },
      },
      {
        businessName: "Akinyele Agro Farms",
        state: "Oyo",
        lga: "Akinyele",
        address: "Kilometer 12, Moniya-Iseyin Road, Moniya, Akinyele, Oyo State",
        phoneNumber: "+2348255556666",
        description: "Large-scale commercial layer farm producing thousands of crates daily.",
        deliveryAvailable: false,
        rating: 4.5,
        location: { type: "Point", coordinates: [3.9114, 7.5278] },
      },

      // ── OGUN STATE (5 Farms / Depots) ──
      {
        businessName: "Lafenwa Market Poultry Depot",
        state: "Ogun",
        lga: "Abeokuta North",
        address: "14, Lafenwa Market Road, Abeokuta North, Ogun State",
        phoneNumber: "+2348111112222",
        description: "Leading wholesale egg market distributor in Abeokuta North.",
        deliveryAvailable: true,
        rating: 4.6,
        location: { type: "Point", coordinates: [3.3294, 7.1594] },
      },
      {
        businessName: "Oke-Mosan Royal Egg Depot",
        state: "Ogun",
        lga: "Abeokuta South",
        address: "Near Secretariat Complex, Oke-Mosan, Abeokuta South, Ogun State",
        phoneNumber: "+2348122223333",
        description: "Premium table eggs and broilers for government and corporate events.",
        deliveryAvailable: true,
        rating: 4.7,
        location: { type: "Point", coordinates: [3.3654, 7.1189] },
      },
      {
        businessName: "Odeda FUNAAB Poultry Corridor",
        state: "Ogun",
        lga: "Odeda",
        address: "Kilometer 4, Abeokuta-Ibadan Road, Obantoko, Odeda, Ogun State",
        phoneNumber: "+2348133334444",
        description: "Academic standard poultry breeding and affordable egg crates.",
        deliveryAvailable: false,
        rating: 4.3,
        location: { type: "Point", coordinates: [3.4333, 7.1667] },
      },
      {
        businessName: "Sagamu Agro Feeds & Eggs",
        state: "Ogun",
        lga: "Sagamu",
        address: "25, Akarigbo Street, Sabo, Sagamu, Ogun State",
        phoneNumber: "+2348144445555",
        description: "One-stop depot for poultry feeds, fresh egg crates, and pullets.",
        deliveryAvailable: true,
        rating: 4.5,
        location: { type: "Point", coordinates: [3.6482, 6.8482] },
      },
      {
        businessName: "Canaanland Egg Hub Ota",
        state: "Ogun",
        lga: "Ado-Odo/Ota",
        address: "Kilometer 10, Idiroko Road, Ota, Ado-Odo/Ota, Ogun State",
        phoneNumber: "+2348155556666",
        description: "High-yield commercial egg supply hub connecting Ogun and Lagos borders.",
        deliveryAvailable: true,
        rating: 4.8,
        location: { type: "Point", coordinates: [3.2354, 6.6912] },
      },
    ];

    // 5. Sync Poultry Farms & Generate 3 Egg Products for Each
    logger.info(`Syncing ${poultryFarms.length} poultry farms across Lagos, Oyo, and Ogun...`);

    for (const farmInfo of poultryFarms) {
      const isDepot = /hub|basket|palace|feeds|market|depot|supreme|kings|store/i.test(farmInfo.businessName);

      let poultry = await Poultry.findOne({ businessName: farmInfo.businessName });
      if (!poultry) {
        poultry = await Poultry.create({
          ...farmInfo,
          farmType: isDepot ? "depot" : "farmer",
          ownerId: owner._id,
        });

        // Generate 3 egg products per farm only when farm is newly created
        const products = [
          {
            poultryId: poultry._id,
            productName: "Fresh Organic Eggs (Medium)",
            category: "Eggs",
            pricePerCrate: Math.floor(Math.random() * (2600 - 1800 + 1)) + 1800,
            stockQuantity: Math.floor(Math.random() * 400) + 50,
            imageUrl: "https://images.unsplash.com/photo-1516448424440-9dbca97779c1?auto=format&fit=crop&q=80&w=900",
            isAvailable: true,
          },
          {
            poultryId: poultry._id,
            productName: "Jumbo Brown Eggs (Large)",
            category: "Eggs",
            pricePerCrate: Math.floor(Math.random() * (3200 - 2300 + 1)) + 2300,
            stockQuantity: Math.floor(Math.random() * 300) + 40,
            imageUrl: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&q=80&w=900",
            isAvailable: true,
          },
          {
            poultryId: poultry._id,
            productName: "Free-Range Golden Eggs (Special)",
            category: "Eggs",
            pricePerCrate: Math.floor(Math.random() * (3800 - 2700 + 1)) + 2700,
            stockQuantity: Math.floor(Math.random() * 200) + 20,
            imageUrl: "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&q=80&w=900",
            isAvailable: Math.random() > 0.15,
          },
        ];

        await Product.insertMany(products);
      }
    }

    logger.info("🎉 Database successfully seeded with 20 Poultry Farms and 60 Products across Lagos, Oyo, and Ogun!");
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
