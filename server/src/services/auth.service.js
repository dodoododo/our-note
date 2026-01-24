const httpStatus = require('http-status').default;
const userService = require('./user.service');
const ApiError = require('../utils/ApiError');

const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email hoặc mật khẩu không đúng');
  }
  return user;
};

module.exports = {
  loginUserWithEmailAndPassword,
};