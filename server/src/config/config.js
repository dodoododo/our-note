const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoose: {
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017/our-note-db',
    options: {
      // Các options mới của Mongoose 6+ mặc định đã bật, để trống cũng được
    },
  },
};