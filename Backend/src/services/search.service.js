const poultryRepository = require("../repositories/poultry.repository");

class SearchService {
  async searchPoultries(params) {
    const {
      latitude,
      longitude,
      maxDistance,
      state,
      lga,
      minPrice,
      maxPrice,
      deliveryAvailable,
      stockAvailable,
      page = 1,
      limit = 10,
    } = params;

    const pipeline = [];

    // 1. Geospatial near stage
    if (latitude !== undefined && longitude !== undefined) {
      pipeline.push({
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          distanceField: "distance",
          maxDistance: maxDistance ? parseFloat(maxDistance) : 10000, // default 10km in meters
          spherical: true,
        },
      });
    }

    // 2. Lookup products
    pipeline.push({
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "poultryId",
        as: "products",
      },
    });

    // 3. Match filters
    const matchConditions = {};

    if (state) {
      matchConditions.state = { $regex: new RegExp(state, "i") };
    }
    if (lga) {
      matchConditions.lga = { $regex: new RegExp(lga, "i") };
    }
    if (deliveryAvailable !== undefined) {
      matchConditions.deliveryAvailable =
        deliveryAvailable === "true" || deliveryAvailable === true;
    }

    // Product-level filters
    const productFilters = {};
    if (stockAvailable === "true" || stockAvailable === true) {
      productFilters["products.stockQuantity"] = { $gt: 0 };
      productFilters["products.isAvailable"] = true;
    }
    if (minPrice !== undefined) {
      productFilters["products.pricePerCrate"] = {
        ...productFilters["products.pricePerCrate"],
        $gte: parseFloat(minPrice),
      };
    }
    if (maxPrice !== undefined) {
      productFilters["products.pricePerCrate"] = {
        ...productFilters["products.pricePerCrate"],
        $lte: parseFloat(maxPrice),
      };
    }

    // Merge product filters
    Object.assign(matchConditions, productFilters);

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // 4. Project response fields: businessName, state, lga, address, distance, pricePerCrate, deliveryAvailable, location
    pipeline.push({
      $project: {
        businessName: 1,
        state: 1,
        lga: 1,
        address: 1,
        location: 1,
        rating: 1,
        distance: { $ifNull: ["$distance", null] },
        deliveryAvailable: 1,
        pricePerCrate: {
          $ifNull: [{ $min: "$products.pricePerCrate" }, null],
        },
      },
    });

    // 5. Facet for pagination
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: parseInt(limit, 10) }],
      },
    });

    const result = await poultryRepository.aggregate(pipeline);
    const total = result[0]?.metadata[0]?.total || 0;
    const data = result[0]?.data || [];

    return {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      data,
    };
  }
}

module.exports = new SearchService();
