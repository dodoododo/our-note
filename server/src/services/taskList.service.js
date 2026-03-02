const TaskList = require('../models/taskList.model');

const createTaskList = async (body) => {
  return TaskList.create(body);
};

const queryTaskLists = async (filter = {}) => {
  // Lọc theo group_id nếu có, và sắp xếp theo thứ tự order
  return TaskList.find(filter).sort({ order: 1 });
};

const updateTaskListById = async (id, updateBody) => {
  return TaskList.findByIdAndUpdate(id, updateBody, { new: true });
};

const deleteTaskListById = async (id) => {
  return TaskList.findByIdAndDelete(id);
};

module.exports = {
  createTaskList,
  queryTaskLists,
  updateTaskListById,
  deleteTaskListById,
};