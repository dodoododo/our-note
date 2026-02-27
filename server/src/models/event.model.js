const mongoose = require('mongoose');

const eventSchema = mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    group_id: { type: mongoose.SchemaTypes.ObjectId, ref: 'Group', required: true },
    
    // Time & Date
    date: { type: Date, required: true },
    start_time: { type: String, trim: true },
    end_time: { type: String, trim: true },
    
    // Location
    location_name: { type: String, trim: true },
    location_address: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    
    // Event Details
    event_type: { type: String, default: 'other' },
    weather: { type: mongoose.SchemaTypes.Mixed }, // Store mixed JSON for weather
    color: { type: String, default: '#5865F2' },
    
    // Recurrence
    is_recurring: { type: Boolean, default: false },
    recurrence_pattern: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly', 'none'], default: 'none' },
    recurrence_end_date: { type: Date },
    parent_event_id: { type: mongoose.SchemaTypes.ObjectId, ref: 'Event' },
    
    // Interactions
    reminder_minutes: { type: Number, default: 30 },
    rsvp_enabled: { type: Boolean, default: false },
    attendees: [{ type: String, lowercase: true, trim: true }], // Array of emails
    
    // Stored as Array to prevent MongoDB email "." key errors
    rsvp_responses: [{
      _id: false,
      email: { type: String, lowercase: true, trim: true },
      status: { type: String, enum: ['attending', 'declined', 'maybe'] }
    }],
    
    google_calendar_id: { type: String }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        
        // Transform rsvp_responses from Array to Object { "email": "status" } for frontend
        const rsvpObj = {};
        if (ret.rsvp_responses && Array.isArray(ret.rsvp_responses)) {
          ret.rsvp_responses.forEach(item => {
            if (item.email) rsvpObj[item.email] = item.status;
          });
        }
        ret.rsvp_responses = rsvpObj;
      },
    },
  }
);

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;