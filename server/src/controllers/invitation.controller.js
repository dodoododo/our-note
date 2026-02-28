const httpStatus = require('http-status').default || require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const invitationService = require('../services/invitation.service');
const Group = require('../models/group.model');

const createInvitation = catchAsync(async (req, res) => {
  // Securely inject the inviter's details from the authenticated user token
  const invitationData = {
    ...req.body,
    inviter_email: req.user.email,
    inviter_name: req.user.name || req.user.full_name || 'A member',
    status: 'pending' // Force status to pending on creation
  };

  // Prevent user from inviting themselves
  if (invitationData.invitee_email === req.user.email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot invite yourself');
  }

  const invitation = await invitationService.createInvitation(invitationData);
  res.status(httpStatus.CREATED).send(invitation);
});

const getInvitations = catchAsync(async (req, res) => {
  // Automatically filter invitations where the logged-in user is the invitee OR inviter
  const filter = {
    $or: [
      { invitee_email: req.user.email },
      { inviter_email: req.user.email }
    ]
  };
  
  const invitations = await invitationService.queryInvitations(filter);
  res.send(invitations);
});

const updateInvitation = catchAsync(async (req, res) => {
  const updateBody = pick(req.body, ['status']);
  const invitation = await invitationService.updateInvitationById(req.params.invitationId, updateBody, req.user);
  res.send(invitation);
});

const deleteInvitation = catchAsync(async (req, res) => {
  await invitationService.deleteInvitationById(req.params.invitationId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createInvitation,
  getInvitations,
  updateInvitation,
  deleteInvitation,
};