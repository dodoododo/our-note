const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http'); // ✨ MỚI: Import module http có sẵn của Node.js
const socketSetup = require('./src/utils/socket.js'); // ✨ MỚI: Import file socket config mình đã đưa ở bước trước

// Import cấu hình App từ src (nơi chứa routes, middleware...)
const app = require('./src/app');

// 1. Load biến môi trường từ file .env
dotenv.config();

// 2. Lấy các thông số cấu hình
const PORT = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGODB_URL;

// ✨ MỚI: Bọc Express app vào HTTP Server để Socket.IO có thể chạy cùng 1 port
const server = http.createServer(app);

// ✨ MỚI: Khởi tạo Socket.IO với server vừa tạo
socketSetup.init(server);

// 3. Hàm khởi động server
const startServer = async () => {
  try {
    // Kiểm tra xem có link DB chưa
    if (!MONGO_URL) {
      throw new Error('Thiếu biến môi trường MONGODB_URL trong file .env');
    }

    // Kết nối MongoDB
    await mongoose.connect(MONGO_URL);
    console.log('✅ Đã kết nối MongoDB thành công!');

    // ✨ QUAN TRỌNG: Dùng `server.listen` thay vì `app.listen`
    server.listen(PORT, () => {
      console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO đã sẵn sàng!`);
    });

  } catch (error) {
    console.error('❌ Lỗi khởi động Server:', error.message);
    process.exit(1); // Dừng chương trình nếu lỗi nghiêm trọng
  }
};

// Chạy hàm khởi động
startServer();