const httpStatus = require('http-status').default || require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');

// ...

// API: PATCH /users/me
const updateProfile = catchAsync(async (req, res) => {
  // req.user được tạo ra từ middleware 'auth'
  const user = await userService.updateUserById(req.user.id, req.body);
  res.send(user);
});

// API: GET /users/me (Lấy thông tin bản thân)
const getProfile = catchAsync(async (req, res) => {
    // req.user đã có sẵn từ auth middleware, trả về luôn
    res.send(req.user);
});

module.exports = {
  // ...
  updateProfile,
  getProfile
};