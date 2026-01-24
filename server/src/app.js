const express = require('express');
const cors = require('cors');
const httpStatus = require('http-status').default;
const routes = require('./routes/v1/index'); // Import file index của routes
const ApiError = require('./utils/ApiError'); // Class lỗi (nếu bạn đã tạo)

const app = express();

// 1. Cấu hình Middleware cơ bản
app.use(express.json()); // Để đọc được JSON từ body
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Cho phép Frontend gọi API

// 2. Định nghĩa Route (Mọi api v1 sẽ bắt đầu bằng /v1)
// Ví dụ: /v1/auth/login, /v1/users...
app.use('/v1', routes);

// 3. Xử lý lỗi 404 (Nếu không tìm thấy route nào)
app.use((req, res, next) => {
    next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// 4. Middleware xử lý lỗi chung (Trả về JSON lỗi đẹp)
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).send({
        code: statusCode,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

module.exports = app;