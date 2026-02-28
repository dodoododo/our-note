const httpStatus = require('http-status').default || require('http-status');
const Event = require('../models/event.model');
const ApiError = require('../utils/ApiError');

const createEvent = async (eventBody) => {
  return Event.create(eventBody);
};

const queryEvents = async (filter) => {
  return Event.find(filter).sort({ date: 1, start_time: 1 });
};

const getEventById = async (id) => {
  return Event.findById(id);
};

const updateEventById = async (eventId, updateBody) => {
  const event = await getEventById(eventId);
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }

  // Handle RSVP Object to Array conversion if RSVP updates are sent
  if (updateBody.rsvp_responses) {
    const rsvpArray = event.rsvp_responses || [];
    Object.entries(updateBody.rsvp_responses).forEach(([email, status]) => {
      const existing = rsvpArray.find(r => r.email === email);
      if (existing) {
        existing.status = status;
      } else {
        rsvpArray.push({ email, status });
      }
    });
    event.rsvp_responses = rsvpArray;
    delete updateBody.rsvp_responses;
  }

  Object.assign(event, updateBody);
  await event.save();
  return event;
};

const deleteEventById = async (eventId) => {
  const event = await getEventById(eventId);
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }
  await event.deleteOne();
  return event;
};

module.exports = {
  createEvent,
  queryEvents,
  getEventById,
  updateEventById,
  deleteEventById,
};