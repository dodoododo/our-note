const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const groupValidation = require('../../validations/group.validation');
const groupController = require('../../controllers/group.controller');

const router = express.Router();

router
  .route('/')
  .post(auth(), validate(groupValidation.createGroup), groupController.createGroup) // Tạo group
  .get(auth(), groupController.getGroups); // Lấy danh sách group của user

router
  .route('/:groupId')
  .get(auth(), validate(groupValidation.getGroup), groupController.getGroup) // Lấy chi tiết 1 group
  .patch(auth(), validate(groupValidation.updateGroup), groupController.updateGroup) // Sửa group
  .delete(auth(), validate(groupValidation.getGroup), groupController.deleteGroup); // Xóa group

module.exports = router;