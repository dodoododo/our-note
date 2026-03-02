const taskService = require('../services/task.service');

const createTask = async (req, res) => {
  try {
    const task = await taskService.createTask(req.body);
    res.status(201).send(task);
  } catch (error) {
    res.status(500).send({ message: `Lỗi tạo Task: ${error.message}` });
  }
};

const getTasks = async (req, res) => {
  try {
    const filter = req.query.group_id ? { group_id: req.query.group_id } : {};
    const tasks = await taskService.queryTasks(filter);
    res.status(200).send(tasks);
  } catch (error) {
    res.status(500).send({ message: `Lỗi lấy danh sách Task: ${error.message}` });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await taskService.updateTaskById(req.params.id, req.body);
    res.status(200).send(task);
  } catch (error) {
    res.status(500).send({ message: `Lỗi cập nhật Task: ${error.message}` });
  }
};

const deleteTask = async (req, res) => {
  try {
    await taskService.deleteTaskById(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).send({ message: `Lỗi xóa Task: ${error.message}` });
  }
};

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
};