const taskListService = require('../services/taskList.service');

const createTaskList = async (req, res) => {
  try {
    const taskList = await taskListService.createTaskList(req.body);
    res.status(201).send(taskList);
  } catch (error) {
    res.status(500).send({ message: `Lỗi tạo TaskList: ${error.message}` });
  }
};

const getTaskLists = async (req, res) => {
  try {
    const filter = req.query.group_id ? { group_id: req.query.group_id } : {};
    const taskLists = await taskListService.queryTaskLists(filter);
    res.status(200).send(taskLists);
  } catch (error) {
    res.status(500).send({ message: `Lỗi lấy TaskList: ${error.message}` });
  }
};

const updateTaskList = async (req, res) => {
  try {
    const taskList = await taskListService.updateTaskListById(req.params.id, req.body);
    res.status(200).send(taskList);
  } catch (error) {
    res.status(500).send({ message: `Lỗi cập nhật TaskList: ${error.message}` });
  }
};

const deleteTaskList = async (req, res) => {
  try {
    await taskListService.deleteTaskListById(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).send({ message: `Lỗi xóa TaskList: ${error.message}` });
  }
};

module.exports = {
  createTaskList,
  getTaskLists,
  updateTaskList,
  deleteTaskList,
};