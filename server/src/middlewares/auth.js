const jwt = require('jsonwebtoken');
const httpStatus = require('http-status').default || require('http-status');
const ApiError = require('../utils/ApiError');
const User  = require('../models/user.model');

const auth = () => async (req, res, next) => {
  try {
    // 1. Lấy token từ Header (Chuẩn: "Bearer <token>")
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error();
    }

    // 2. Giải mã Token (Lưu ý: JWT_SECRET phải khớp với file .env)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Tìm User trong Database dựa trên ID trong token
    // (decoded.sub hoặc decoded.id tùy vào cách bạn generate token)
    const user = await User.findById(decoded.sub || decoded.id);

    if (!user) {
      throw new Error();
    }

    // 4. Gắn user vào req để Controller bên trong có thể dùng (req.user)
    req.user = user;
    next();
  } catch (error) {
    next(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }
};

module.exports = auth;