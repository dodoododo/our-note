const httpStatus = require('http-status').default || require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { groupService } = require('../services');

const createGroup = catchAsync(async (req, res) => {
  // req.user lấy từ auth middleware
  const group = await groupService.createGroup(req.body, req.user);
  res.status(httpStatus.CREATED).send(group);
});

const getGroups = catchAsync(async (req, res) => {
  // Lấy tất cả group mà user này là thành viên
  const groups = await groupService.getGroupsByUserEmail(req.user.email);
  res.send(groups);
});

const getGroup = catchAsync(async (req, res) => {
  const group = await groupService.getGroupById(req.params.groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
  }
  // Check xem user có trong group không mới cho xem
  if (!group.members.includes(req.user.email)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not a member of this group');
  }
  res.send(group);
});

const updateGroup = catchAsync(async (req, res) => {
  const group = await groupService.updateGroupById(req.params.groupId, req.body, req.user);
  res.send(group);
});

const deleteGroup = catchAsync(async (req, res) => {
  await groupService.deleteGroupById(req.params.groupId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup,
};