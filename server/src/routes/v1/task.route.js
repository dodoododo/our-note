const express = require('express');
const taskController = require('../../controllers/task.controller');

const router = express.Router();

router
  .route('/')
  .post(taskController.createTask)
  .get(taskController.getTasks);

router
  .route('/:id')
  .patch(taskController.updateTask)
  .delete(taskController.deleteTask);

module.exports = router;