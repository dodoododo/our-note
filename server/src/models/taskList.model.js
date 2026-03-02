const mongoose = require('mongoose');

const taskListSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    group_id: { type: String, required: true },
    order: { type: Number, default: 0 },
    color: { type: String, default: '#5865F2' } // Đã thêm trường màu sắc
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const TaskList = mongoose.model('TaskList', taskListSchema);
module.exports = TaskList;