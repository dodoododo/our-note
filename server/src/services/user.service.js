const httpStatus = require('http-status').default || require('http-status');
const User  = require('../models/user.model');
const ApiError = require('../utils/ApiError');

/**
 * Tạo user mới (Giữ nguyên)
 */
const createUser = async (userBody) => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email đã tồn tại');
  }
  return User.create(userBody);
};

/**
 * Lấy user bằng email (Giữ nguyên)
 */
const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

/**
 * Lấy user bằng ID (Cần thêm cái này để tìm user nhanh nhất)
 */
const getUserById = async (id) => {
  return User.findById(id);
};

/**
 * Cập nhật User theo ID (Khuyên dùng ID vì Token chứa ID)
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // CHẶN: Nếu user cố tình gửi email lên để đổi -> Xóa field email khỏi body hoặc báo lỗi
  if (updateBody.email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Không được phép thay đổi Email');
    // Hoặc âm thầm xóa: delete updateBody.email;
  }

  // Copy thông tin mới đè lên cũ
  Object.assign(user, updateBody);
  
  await user.save();
  return user;
};

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,    // <-- Export thêm
  updateUserById, // <-- Export thêm
};