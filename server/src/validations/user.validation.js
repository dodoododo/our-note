const Joi = require('joi');

// Validation cho API update thông tin cá nhân
const updateUser = {
  body: Joi.object()
    .keys({
      email: Joi.string().email(), // Cho phép đổi email (tùy chọn)
      password: Joi.string().min(6),
      name: Joi.string(),
      profile_pic_url: Joi.string().allow(''), // Cho phép chuỗi rỗng để xóa avatar
      theme_hue: Joi.number().min(0).max(360), // Hệ màu HSL từ 0-360
    })
    .min(1), // Bắt buộc phải gửi ít nhất 1 trường để update
};

module.exports = {
  // ... các cái cũ
  updateUser,
};