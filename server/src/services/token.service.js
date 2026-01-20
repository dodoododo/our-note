const jwt = require('jsonwebtoken');
const moment = require('moment');
// Giả sử bạn lưu secret trong config, nếu chưa có thì hardcode tạm 'secret-key'
const config = require('../config/config'); 

const generateToken = (userId, expires, type, secret = process.env.JWT_SECRET || 'secret-key') => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

const generateAuthTokens = async (user) => {
  const accessTokenExpires = moment().add(60, 'minutes'); // Token sống 60 phút
  const accessToken = generateToken(user.id, accessTokenExpires, 'access');

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
  };
};

module.exports = {
  generateToken,
  generateAuthTokens,
};