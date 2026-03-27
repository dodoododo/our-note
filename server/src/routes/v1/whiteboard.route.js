const express = require('express');
const router = express.Router();
const whiteboardController = require('../../controllers/whiteboard.controller');
const auth = require('../../middlewares/auth'); // Đường dẫn tới file auth middleware của bạn

// Áp dụng auth() cho toàn bộ các route bên dưới
router.use(auth());

// 1. Lấy danh sách nét vẽ
router.get('/:groupId/:whiteboardId', whiteboardController.getStrokes);

// 2. Tạo nét vẽ / text / ảnh mới
router.post('/', whiteboardController.createStroke);

// 3. XÓA 1 NÉT VẼ (UNDO) - CHÚ Ý: Route này bắt buộc phải nằm TRƯỚC route Clear bên dưới
router.delete('/undo/:strokeId', whiteboardController.undoStroke);

// 4. Xóa trắng bảng vẽ (CLEAR)
router.delete('/:groupId/:whiteboardId', whiteboardController.clearWhiteboard);

module.exports = router;