const crypto = require("crypto");
const Invitation = require("../models/invitation.model");
const User = require("../models/user.model");
const Poultry = require("../models/poultry.model");
const ApiError = require("../utils/ApiError");
const emailService = require("./email.service");
const env = require("../config/env");

class InvitationService {
  /**
   * Generates a new invitation.
   */
  async createInvitation(data, adminId) {
    const { email, businessName } = data;

    // Check if email already exists in User records
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict("A user with this email address already exists");
    }

    // Check if active/pending invitation already exists
    const existingInv = await Invitation.findOne({ email, status: "pending" });
    if (existingInv) {
      throw ApiError.conflict("A pending invitation has already been sent to this email");
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString("hex");
    // Hash token for database storage
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Set expiry to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const invitation = await Invitation.create({
      email,
      businessName,
      tokenHash,
      expiresAt,
      invitedBy: adminId,
      status: "pending",
    });

    // Invitation link
    const invitationLink = `${env.CORS_ORIGIN}/pages/register-invite.html?token=${token}`;

    // Send onboarding invitation email
    await emailService.sendFarmOwnerInvitation(email, businessName, invitationLink, false);

    return {
      ...invitation.toObject(),
      rawToken: token,
    };
  }

  /**
   * List all invitations.
   */
  async getInvitations() {
    return Invitation.find().populate("invitedBy", "firstName lastName email").sort({ createdAt: -1 });
  }

  /**
   * Resend an invitation.
   */
  async resendInvitation(id, adminId) {
    const invitation = await Invitation.findById(id);
    if (!invitation) {
      throw ApiError.notFound("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw ApiError.badRequest(`Cannot resend an invitation that is already ${invitation.status}`);
    }

    // Generate new secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    invitation.tokenHash = tokenHash;
    invitation.expiresAt = expiresAt;
    invitation.invitedBy = adminId;
    await invitation.save();

    const invitationLink = `${env.CORS_ORIGIN}/pages/register-invite.html?token=${token}`;

    await emailService.sendFarmOwnerInvitation(invitation.email, invitation.businessName, invitationLink, true);

    return {
      ...invitation.toObject(),
      rawToken: token,
    };
  }

  /**
   * Revoke an invitation.
   */
  async revokeInvitation(id) {
    const invitation = await Invitation.findById(id);
    if (!invitation) {
      throw ApiError.notFound("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw ApiError.badRequest(`Cannot revoke an invitation that is already ${invitation.status}`);
    }

    invitation.status = "revoked";
    await invitation.save();
    return invitation;
  }

  /**
   * Verifies invitation token validity.
   */
  async verifyToken(token) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const invitation = await Invitation.findOne({
      tokenHash,
      status: "pending",
      expiresAt: { $gt: Date.now() },
    });

    if (!invitation) {
      throw ApiError.badRequest("Invitation link is invalid, revoked, or has expired");
    }

    return invitation;
  }

  /**
   * Accepts invitation, creates Farm Owner and Poultry Farm, and burns token.
   */
  async acceptInvitation(token, registrationData) {
    const invitation = await this.verifyToken(token);

    const {
      firstName,
      lastName,
      phone,
      password,
      state,
      lga,
      address,
      latitude,
      longitude,
    } = registrationData;

    // Check if email already used (extra safety check)
    const existingUser = await User.findOne({ email: invitation.email });
    if (existingUser) {
      throw ApiError.conflict("A user with this email has already registered");
    }

    // 1. Create User (FARM_OWNER)
    const user = await User.create({
      firstName,
      lastName,
      email: invitation.email,
      password,
      role: "FARM_OWNER",
      phone: phone || "",
      isVerified: true, // Verification achieved via invitation email link
      isActive: true,
    });

    // 2. Create default Poultry farm profile
    const coords = [
      parseFloat(longitude) || 3.3792,
      parseFloat(latitude) || 6.5244,
    ]; // Lagos default if not supplied

    await Poultry.create({
      businessName: invitation.businessName,
      ownerId: user._id,
      state: state || "Lagos",
      lga: lga || "Ikeja",
      address: address || "Default Address",
      phoneNumber: phone || "08000000000",
      description: `Premium poultry services by ${invitation.businessName}`,
      location: {
        type: "Point",
        coordinates: coords,
      },
    });

    // 3. Burn invitation
    invitation.status = "accepted";
    await invitation.save();

    return user;
  }
}

module.exports = new InvitationService();
