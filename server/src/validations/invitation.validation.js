const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createInvitation = {
  body: Joi.object().keys({
    group_id: Joi.string().custom(objectId).required(),
    group_name: Joi.string().required(),
    invitee_email: Joi.string().email().required(),
  }),
};

const getInvitations = {
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'accepted', 'declined', 'expired'),
    invitee_email: Joi.string().email(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }).unknown(true),
};

const updateInvitation = {
  params: Joi.object().keys({
    invitationId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('pending', 'accepted', 'declined', 'expired').required(),
  }).unknown(true), // Allow unknown fields just in case frontend sends extra data
};

const deleteInvitation = {
  params: Joi.object().keys({
    invitationId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createInvitation,
  getInvitations,
  updateInvitation,
  deleteInvitation,
};