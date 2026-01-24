const httpStatus = require('http-status').default;
const User = require('../models/user.model');
const ApiError = require('../utils/ApiError'); // Class lỗi bạn đã có

const createUser = async (userBody) => {
  if (await User.findOne({ email: userBody.email })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email đã tồn tại');
  }
  return User.create(userBody);
};

const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

module.exports = {
  createUser,
  getUserByEmail,
};