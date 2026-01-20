const mongoose = require('mongoose');
const dotenv = require('dotenv');
// Import cấu hình App từ src (nơi chứa routes, middleware...)
const app = require('./src/app');

// 1. Load biến môi trường từ file .env
dotenv.config();

// 2. Lấy các thông số cấu hình
const PORT = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGODB_URL;

// 3. Hàm khởi động server
const startServer = async () => {
  try {
    // Kiểm tra xem có link DB chưa
    if (!MONGO_URL) {
      throw new Error('Thiếu biến môi trường MONGODB_URL trong file .env');
    }

    // Kết nối MongoDB
    // (Từ Mongoose v6 trở lên không cần mấy option useNewUrlParser cũ nữa)
    await mongoose.connect(MONGO_URL);
    console.log('✅ Đã kết nối MongoDB thành công!');

    // Sau khi kết nối DB thành công thì mới cho Server lắng nghe
    app.listen(PORT, () => {
      console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Lỗi khởi động Server:', error.message);
    process.exit(1); // Dừng chương trình nếu lỗi nghiêm trọng
  }
};

// Chạy hàm khởi động
startServer();