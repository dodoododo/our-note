const Joi = require('joi');
const { objectId } = require('./custom.validation'); // Nếu có custom val cho objectId

const createGroup = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    type: Joi.string().required().valid('family', 'couple', 'friends', 'work'),
    description: Joi.string().allow(''),
    couple_start_date: Joi.date(),
    // Các trường khác là optional khi tạo
    avatar_url: Joi.string().allow(''),
    color: Joi.string(),
  }),
};

const updateGroup = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      type: Joi.string().valid('family', 'couple', 'friends', 'work'),
      avatar_url: Joi.string().allow(''),
      description: Joi.string().allow(''),
      color: Joi.string(),
      couple_start_date: Joi.date(),
      
      // Settings
      notifications_enabled: Joi.boolean(),
      notify_on_task_assignment: Joi.boolean(),
      notify_on_event_changes: Joi.boolean(),
      notify_on_new_notes: Joi.boolean(),
      is_private: Joi.boolean(),
      allow_member_invites: Joi.boolean(),
      
      // Member updates (nếu cần update trực tiếp roles/names qua API này)
      member_roles: Joi.object().pattern(Joi.string().email(), Joi.string().valid('admin', 'member')),
      member_names: Joi.object().pattern(Joi.string().email(), Joi.string()),
    })
    .min(1),
};

const getGroup = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createGroup,
  updateGroup,
  getGroup,
};