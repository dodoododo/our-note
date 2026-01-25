const express = require('express');
const auth = require('../../middlewares/auth'); // Middleware kiểm tra đăng nhập
const validate = require('../../middlewares/validate');
const userValidation = require('../../validations/user.validation');
const userController = require('../../controllers/user.controller');

const router = express.Router();

// Cụm route cho "Me" (Bản thân user đang login)
router
  .route('/me')
  .get(auth(), userController.getProfile) // GET /v1/users/me
  .patch(auth(), validate(userValidation.updateUser), userController.updateProfile); // PATCH /v1/users/me

// ... Các route CRUD admin (nếu có) để phía dưới ...

module.exports = router;