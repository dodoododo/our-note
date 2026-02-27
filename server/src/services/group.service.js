const httpStatus = require('http-status').default || require('http-status');
const Group = require('../models/group.model'); 
const ApiError = require('../utils/ApiError');

/**
 * Helper: Cập nhật mảng dựa trên object { email: value } từ frontend gửi lên
 */
const syncArrayFromObject = (array, updateObj, valueKey) => {
  if (!updateObj) return;
  Object.entries(updateObj).forEach(([email, value]) => {
    // Tìm xem email này đã có trong mảng chưa
    const existingItem = array.find(item => item.email === email);
    if (existingItem) {
      existingItem[valueKey] = value; // Update
    } else {
      array.push({ email, [valueKey]: value }); // Insert new
    }
  });
};

/**
 * Tạo Group mới
 */
const createGroup = async (groupBody, user) => {
  const userEmail = user.email;
  const userName = user.name || user.full_name || "User";

  if (groupBody.couple_start_date === '') {
    delete groupBody.couple_start_date;
  }

  const groupData = {
    ...groupBody,
    owner: userEmail,
    members: [userEmail],
    
    // --- 👇 LƯU DẠNG ARRAY 👇 ---
    member_names: [{ email: userEmail, name: userName }],
    member_roles: [{ email: userEmail, role: 'admin' }]
    // ----------------------------
  };

  return Group.create(groupData);
};

const getGroupById = async (id) => {
  return Group.findById(id);
};

/**
 * Update Group
 */
const updateGroupById = async (groupId, updateBody, user) => {
  const group = await getGroupById(groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
  }

  if (!group.members.includes(user.email)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }

  // --- 👇 XỬ LÝ UPDATE MEMBERS/ROLES 👇 ---
  // Frontend gửi object { email: val }, ta cần đồng bộ vào Array của DB
  
  if (updateBody.members) {
    // Nếu có update danh sách members (ví dụ xóa member)
    // Ta cần lọc bỏ những name/role của member không còn trong list
    group.members = updateBody.members;
    group.member_names = group.member_names.filter(m => updateBody.members.includes(m.email));
    group.member_roles = group.member_roles.filter(m => updateBody.members.includes(m.email));
    delete updateBody.members;
  }

  if (updateBody.member_names) {
    syncArrayFromObject(group.member_names, updateBody.member_names, 'name');
    delete updateBody.member_names;
  }

  if (updateBody.member_roles) {
    syncArrayFromObject(group.member_roles, updateBody.member_roles, 'role');
    delete updateBody.member_roles;
  }
  // ---------------------------------------

  Object.assign(group, updateBody);
  await group.save();
  return group;
};

const deleteGroupById = async (groupId, user) => {
  const group = await getGroupById(groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
  }
  if (group.owner !== user.email) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only owner can delete the group');
  }
  await group.deleteOne();
  return group;
};

const getGroupsByUserEmail = async (email) => {
    return Group.find({ members: email });
};

module.exports = {
  createGroup,
  getGroupById,
  updateGroupById,
  deleteGroupById,
  getGroupsByUserEmail
};