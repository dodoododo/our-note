const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const noteValidation = require('../../validations/note.validation');
const noteController = require('../../controllers/note.controller');

const router = express.Router();

router
  .route('/')
  .post(auth(), validate(noteValidation.createNote), noteController.createNote)
  .get(auth(), validate(noteValidation.getNotes), noteController.getNotes);

router
  .route('/:noteId')
  .get(auth(), validate(noteValidation.getNote), noteController.getNote)
  .patch(auth(), validate(noteValidation.updateNote), noteController.updateNote)
  .delete(auth(), validate(noteValidation.deleteNote), noteController.deleteNote);

module.exports = router;