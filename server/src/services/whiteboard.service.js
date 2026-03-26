const WhiteboardStroke = require('../models/whiteboard.model');

/**
 * Lấy danh sách nét vẽ của bảng
 */
const getStrokesByGroup = async (groupId, whiteboardId = 'main') => {
  return await WhiteboardStroke.find({
    group_id: groupId,
    whiteboard_id: whiteboardId,
  }).sort({ created_at: 1 });
};

/**
 * Lưu nét vẽ mới
 */
const createStroke = async (strokeDataPayload) => {
  const newStroke = new WhiteboardStroke(strokeDataPayload);
  return await newStroke.save();
};

/**
 * Xóa trắng bảng vẽ
 */
const clearWhiteboardStrokes = async (groupId, whiteboardId = 'main') => {
  return await WhiteboardStroke.deleteMany({
    group_id: groupId,
    whiteboard_id: whiteboardId,
  });
};

module.exports = {
  getStrokesByGroup,
  createStroke,
  clearWhiteboardStrokes,
};