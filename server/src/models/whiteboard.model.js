const mongoose = require('mongoose');

const whiteboardStrokeSchema = new mongoose.Schema(
  {
    group_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID is required'],
      index: true // Đánh index để truy vấn bảng vẽ nhanh hơn
    },
    whiteboard_id: {
      type: String,
      default: 'main',
      index: true
    },
    author_email: {
      type: String,
      required: [true, 'Author email is required']
    },
    author_name: {
      type: String,
      default: 'Unknown User'
    },
    stroke_data: {
      // Dùng Schema.Types.Mixed để cho phép lưu trữ bất kỳ cấu trúc JSON nào
      // (Nét vẽ, Text, Hình học, Link ảnh...)
      type: mongoose.Schema.Types.Mixed, 
      required: [true, 'Stroke data is required']
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

module.exports = mongoose.model('WhiteboardStroke', whiteboardStrokeSchema);