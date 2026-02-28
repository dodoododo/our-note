const httpStatus = require('http-status').default || require('http-status');
const Invitation = require('../models/invitation.model');
const Group = require('../models/group.model');
const ApiError = require('../utils/ApiError');

/**
 * Create a new invitation
 */
const createInvitation = async (invitationBody) => {
  // Prevent sending multiple 'pending' invites to the same person for the same group
  const existingInvite = await Invitation.findOne({
    group_id: invitationBody.group_id,
    invitee_email: invitationBody.invitee_email,
    status: 'pending'
  });

  if (existingInvite) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'A pending invitation already exists for this user.');
  }

  return Invitation.create(invitationBody);
};

/**
 * Query invitations (Find by invitee_email, group_id, etc.)
 */
const queryInvitations = async (filter) => {
  return Invitation.find(filter).sort({ createdAt: -1 }); // Newest first
};

/**
 * Get invitation by ID
 */
const getInvitationById = async (id) => {
  return Invitation.findById(id);
};

/**
 * Update invitation status (Accept / Decline)
 */
const updateInvitationById = async (invitationId, updateBody, userObj) => {
  const invitation = await getInvitationById(invitationId);
  if (!invitation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invitation not found');
  }

  // LÔ-GIC TỰ ĐỘNG THÊM VÀO GROUP KHI BẤM ACCEPT
  if (updateBody.status === 'accepted' && invitation.status !== 'accepted') {
    const group = await Group.findById(invitation.group_id);
    
    if (group) {
      // 1. Thêm email vào danh sách members (nếu chưa có)
      if (!group.members.includes(invitation.invitee_email)) {
        group.members.push(invitation.invitee_email);
      }

      // 2. Thêm tên người dùng vào object member_names
      if (!group.member_names) {
        group.member_names = {};
      }
      
      const userName = userObj ? (userObj.full_name || userObj.name) : invitation.invitee_email;
      group.member_names[invitation.invitee_email] = userName;

      // Báo cho Mongoose biết object map đã bị thay đổi để nó save
      group.markModified('member_names');
      await group.save();
    }
  }

  // Cập nhật trạng thái của invitation thành 'accepted' hoặc 'declined'
  Object.assign(invitation, updateBody);
  await invitation.save();
  return invitation;
};

/**
 * Delete invitation
 */
const deleteInvitationById = async (invitationId) => {
  const invitation = await getInvitationById(invitationId);
  if (!invitation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invitation not found');
  }
  await invitation.deleteOne();
  return invitation;
};

module.exports = {
  createInvitation,
  queryInvitations,
  getInvitationById,
  updateInvitationById,
  deleteInvitationById,
};