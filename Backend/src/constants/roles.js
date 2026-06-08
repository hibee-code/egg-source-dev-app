/**
 * User roles for the Egg Source platform.
 */
const ROLES = Object.freeze({
  CUSTOMER: "CUSTOMER",
  FARM_OWNER: "FARM_OWNER",
  DEPOT_OWNER: "DEPOT_OWNER",
  ADMIN: "ADMIN",
});

const ALL_ROLES = Object.values(ROLES);

module.exports = { ROLES, ALL_ROLES };
