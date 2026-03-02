const express = require('express');
const taskListController = require('../../controllers/taskList.controller');

const router = express.Router();

router
  .route('/')
  .post(taskListController.createTaskList)
  .get(taskListController.getTaskLists);

router
  .route('/:id')
  .patch(taskListController.updateTaskList)
  .delete(taskListController.deleteTaskList);

module.exports = router;