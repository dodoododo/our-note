const whiteboardService = require('../services/whiteboard.service');
const httpStatus = require('http-status').default || require('http-status');
const socket = require('../utils/socket'); // Chỉnh lại cho đúng đường dẫn file socket của bạn

exports.getStrokes = async (req, res, next) => {
  try {
    const { groupId, whiteboardId } = req.params;
    console.log(`📥 [GET] Yêu cầu lấy dữ liệu bảng vẽ - Group: ${groupId}`);

    if (!groupId) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: "Group ID is required" });
    }

    const strokes = await whiteboardService.getStrokesByGroup(groupId, whiteboardId);
    console.log(`✅ [GET] Đã trả về ${strokes.length} nét vẽ cho Group: ${groupId}`);
    res.status(httpStatus.OK).json(strokes);
  } catch (error) {
    console.error(`❌ [GET Error] Lỗi khi lấy dữ liệu bảng vẽ:`, error);
    next(error); 
  }
};

exports.createStroke = async (req, res, next) => {
  try {
    const { group_id, whiteboard_id, stroke_data } = req.body;
    
    // Lấy thông tin user từ middleware auth
    const author_email = req.user.email;
    const author_name = req.user.full_name || req.user.name || req.user.firstName || 'Unknown';

    console.log(`📥 [POST] User [${author_email}] đang lưu nét vẽ mới vào Group [${group_id}]`);

    if (!group_id || !stroke_data) {
      console.log(`❌ [POST Error] Thiếu dữ liệu bắt buộc (group_id hoặc stroke_data)`);
      return res.status(httpStatus.BAD_REQUEST).json({ message: "Missing group_id or stroke_data" });
    }

    const savedStroke = await whiteboardService.createStroke({
      group_id,
      whiteboard_id: whiteboard_id || 'main',
      author_email,
      author_name,
      stroke_data,
    });
    
    console.log(`✅ [POST] Đã lưu vào MongoDB. Chuẩn bị bắn Socket...`);
    
    // BẮN SOCKET
    const io = socket.getIO();
    io.to(group_id).emit('receive_stroke', savedStroke);
    console.log(`🚀 [Socket Emit] Đã phát sự kiện 'receive_stroke' tới room: ${group_id}`);

    res.status(httpStatus.CREATED).json(savedStroke);
  } catch (error) {
    console.error(`❌ [POST Error] Lỗi khi lưu nét vẽ:`, error);
    next(error);
  }
};

exports.clearWhiteboard = async (req, res, next) => {
  try {
    const { groupId, whiteboardId } = req.params;
    console.log(`📥 [DELETE] Yêu cầu xóa trắng bảng vẽ - Group: ${groupId}`);

    if (!groupId) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: "Group ID is required" });
    }

    const result = await whiteboardService.clearWhiteboardStrokes(groupId, whiteboardId);
    console.log(`✅ [DELETE] Đã xóa ${result.deletedCount} nét vẽ khỏi MongoDB.`);

    // BẮN SOCKET
    const io = socket.getIO();
    io.to(groupId).emit('whiteboard_cleared', { groupId, whiteboardId: whiteboardId || 'main' });
    console.log(`🚀 [Socket Emit] Đã phát sự kiện 'whiteboard_cleared' tới room: ${groupId}`);

    res.status(httpStatus.OK).json({ 
      message: "Whiteboard cleared successfully",
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error(`❌ [DELETE Error] Lỗi khi xóa bảng vẽ:`, error);
    next(error);
  }
};

// Thêm hàm này vào cuối file whiteboard.controller.js
exports.undoStroke = async (req, res, next) => {
  try {
    const { strokeId } = req.params;
    const author_email = req.user.email; // Lấy email từ token

    // Gọi DB xóa nét vẽ (điều kiện: đúng ID và đúng người vẽ mới được xóa)
    const WhiteboardStroke = require('../models/whiteboard.model');
    const deletedStroke = await WhiteboardStroke.findOneAndDelete({
      _id: strokeId,
      author_email: author_email 
    });

    if (!deletedStroke) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "Không tìm thấy nét vẽ hoặc bạn không có quyền xóa!" });
    }

    // BẮN SOCKET: Báo cho cả phòng biết nét vẽ này vừa bị Undo
    const io = socket.getIO();
    io.to(deletedStroke.group_id.toString()).emit('stroke_deleted', strokeId);

    res.status(httpStatus.OK).json({ message: "Undo thành công", strokeId });
  } catch (error) {
    console.error(`❌ [UNDO Error]:`, error);
    next(error);
  }
};