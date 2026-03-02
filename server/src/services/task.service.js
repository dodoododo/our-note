const Task = require('../models/task.model');

const createTask = async (body) => {
  return Task.create(body);
};

const queryTasks = async (filter = {}) => {
  return Task.find(filter).sort({ order: 1, created_at: -1 });
};

const updateTaskById = async (id, updateBody) => {
  return Task.findByIdAndUpdate(id, updateBody, { new: true });
};

const deleteTaskById = async (id) => {
  // Tự động xóa luôn tất cả các sub-task nằm bên trong task này
  await Task.deleteMany({ parent_task_id: id });
  return Task.findByIdAndDelete(id);
};

module.exports = {
  createTask,
  queryTasks,
  updateTaskById,
  deleteTaskById,
};