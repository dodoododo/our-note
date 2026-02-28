const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createEvent = {
  body: Joi.object().keys({
    title: Joi.string().required(),
    group_id: Joi.string().custom(objectId).required(),
    date: Joi.date().iso().required(),
    start_time: Joi.string().allow('', null),
    end_time: Joi.string().allow('', null),
    description: Joi.string().allow('', null),
    location_name: Joi.string().allow('', null),
    location_address: Joi.string().allow('', null),
    latitude: Joi.number().allow(null),
    longitude: Joi.number().allow(null),
    event_type: Joi.string(),
    color: Joi.string(),
    is_recurring: Joi.boolean(),
    recurrence_pattern: Joi.string(),
    recurrence_end_date: Joi.date().iso().allow(null),
    reminder_minutes: Joi.number(),
    rsvp_enabled: Joi.boolean(),
    parent_event_id: Joi.string().custom(objectId).allow(null)
  }).min(1).unknown(true),
};

const getEvents = {
  query: Joi.object().keys({
    group_id: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getEvent = {
  params: Joi.object().keys({
    eventId: Joi.string().custom(objectId),
  }),
};

const updateEvent = {
  params: Joi.object().keys({
    eventId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    title: Joi.string(),
    group_id: Joi.string().custom(objectId),
    date: Joi.date().iso(),
    start_time: Joi.string().allow('', null),
    end_time: Joi.string().allow('', null),
    description: Joi.string().allow('', null),
    location_name: Joi.string().allow('', null),
    location_address: Joi.string().allow('', null),
    latitude: Joi.number().allow(null),
    longitude: Joi.number().allow(null),
    event_type: Joi.string(),
    color: Joi.string(),
    // Allow updating RSVPs from frontend object
    rsvp_responses: Joi.object().pattern(Joi.string().email(), Joi.string().valid('attending', 'declined', 'maybe')),
    parent_event_id: Joi.string().custom(objectId).allow(null)
  }).min(1).unknown(true),
};

const deleteEvent = {
  params: Joi.object().keys({
    eventId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
};