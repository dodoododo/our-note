const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const invitationValidation = require('../../validations/invitation.validation');
const invitationController = require('../../controllers/invitation.controller');

const router = express.Router();

router
  .route('/')
  .post(auth(), validate(invitationValidation.createInvitation), invitationController.createInvitation)
  .get(auth(), validate(invitationValidation.getInvitations), invitationController.getInvitations);

router
  .route('/:invitationId')
  .patch(auth(), validate(invitationValidation.updateInvitation), invitationController.updateInvitation)
  .delete(auth(), validate(invitationValidation.deleteInvitation), invitationController.deleteInvitation);

module.exports = router;