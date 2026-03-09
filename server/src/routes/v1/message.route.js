const express = require('express');
const router = express.Router();
const messageController = require('../../controllers/message.controller.js');

// In a real app, you would add an authentication middleware here
// e.g., router.use(authMiddleware);

// GET /api/v1/messages?group_id=123
router.get('/', messageController.getMessages);

// POST /api/v1/messages
router.post('/', messageController.createMessage);

// POST /api/v1/messages/group/:groupId/read
router.post('/group/:groupId/read', messageController.markGroupAsRead);

// DELETE /api/v1/messages/:id
router.delete('/:id', messageController.deleteMessage);

module.exports = router;