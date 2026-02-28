const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createNote = {
  body: Joi.object().keys({
    title: Joi.string().required(),
    group_id: Joi.string().custom(objectId).required(),
    content: Joi.string().allow('', null),
    is_pinned: Joi.boolean(),
    color: Joi.string(),
  }).unknown(true), // Cho phép frontend gửi dư field nếu có
};

const getNotes = {
  query: Joi.object().keys({
    group_id: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getNote = {
  params: Joi.object().keys({
    noteId: Joi.string().custom(objectId),
  }),
};

const updateNote = {
  params: Joi.object().keys({
    noteId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    title: Joi.string(),
    content: Joi.string().allow('', null),
    group_id: Joi.string().custom(objectId),
    is_pinned: Joi.boolean(),
    color: Joi.string(),
  }).min(1).unknown(true),
};

const deleteNote = {
  params: Joi.object().keys({
    noteId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
};