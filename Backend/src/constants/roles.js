/**
 * User roles for the Egg Source platform.
 */
const ROLES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  FARM_OWNER: "FARM_OWNER",
  CUSTOMER: "CUSTOMER",
});

const ALL_ROLES = Object.values(ROLES);

module.exports = { ROLES, ALL_ROLES };
