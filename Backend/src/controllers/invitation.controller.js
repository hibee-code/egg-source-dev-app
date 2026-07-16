const catchAsync = require("../utils/catchAsync");
const { sendSuccess } = require("../utils/ApiResponse");
const invitationService = require("../services/invitation.service");
const authService = require("../services/auth.service");

/**
 * @desc    Create and send a new Farm Owner invitation
 * @route   POST /api/v1/invitations
 * @access  Protected (Super Admin only)
 */
const createInvitation = catchAsync(async (req, res) => {
  const invitation = await invitationService.createInvitation(req.body, req.user._id);
  sendSuccess(res, 201, "Invitation generated and sent successfully", invitation);
});

/**
 * @desc    Get all invitations
 * @route   GET /api/v1/invitations
 * @access  Protected (Super Admin only)
 */
const getInvitations = catchAsync(async (req, res) => {
  const invitations = await invitationService.getInvitations();
  sendSuccess(res, 200, "Invitations retrieved successfully", invitations);
});

/**
 * @desc    Resend a pending invitation
 * @route   POST /api/v1/invitations/:id/resend
 * @access  Protected (Super Admin only)
 */
const resendInvitation = catchAsync(async (req, res) => {
  const invitation = await invitationService.resendInvitation(req.params.id, req.user._id);
  sendSuccess(res, 200, "Invitation resent successfully", invitation);
});

/**
 * @desc    Revoke a pending invitation
 * @route   DELETE /api/v1/invitations/:id/revoke
 * @access  Protected (Super Admin only)
 */
const revokeInvitation = catchAsync(async (req, res) => {
  const invitation = await invitationService.revokeInvitation(req.params.id);
  sendSuccess(res, 200, "Invitation revoked successfully", invitation);
});

/**
 * @desc    Verify invitation token (public check before showing registration form)
 * @route   GET /api/v1/invitations/verify/:token
 * @access  Public
 */
const verifyInvitationToken = catchAsync(async (req, res) => {
  const invitation = await invitationService.verifyToken(req.params.token);
  sendSuccess(res, 200, "Invitation token is valid", {
    email: invitation.email,
    businessName: invitation.businessName,
  });
});

/**
 * @desc    Accept invitation and register Farm Owner account
 * @route   POST /api/v1/invitations/accept/:token
 * @access  Public
 */
const acceptInvitation = catchAsync(async (req, res) => {
  const user = await invitationService.acceptInvitation(req.params.token, req.body);
  
  // Auto-login the user after registration
  const { accessToken } = await authService.login(
    user.email,
    req.body.password,
    res,
    req.ip,
    req.headers["user-agent"]
  );

  sendSuccess(res, 201, "Invitation accepted and registration complete", {
    user,
    accessToken,
  });
});

module.exports = {
  createInvitation,
  getInvitations,
  resendInvitation,
  revokeInvitation,
  verifyInvitationToken,
  acceptInvitation,
};
