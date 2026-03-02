const mongoose = require('mongoose');

const taskSchema = mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    group_id: { type: String, required: true },
    list_name: { type: String, required: true },
    status: { type: String, default: 'todo' },
    label: { type: String, default: 'normal' },
    order: { type: Number, default: 0 },
    assigned_to: [{ type: String }],
    due_date: { type: String, default: null },
    completed: { type: Boolean, default: false },
    completion_percentage: { type: Number, default: 0 },
    parent_task_id: { type: String, default: null },
    depends_on: [{ type: String }]
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;