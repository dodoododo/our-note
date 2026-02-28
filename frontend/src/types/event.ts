export interface Event {
  id: string; // The backend usually returns 'id' (mapped from MongoDB '_id')
  
  // Basic Info
  title: string;
  description?: string;
  group_id: string; // References the Group this event belongs to
  
  // Time & Date
  date: string; // Format: 'YYYY-MM-DD' (e.g., "2026-02-28")
  start_time?: string; // Format: 'HH:mm' (e.g., "07:00")
  end_time?: string; // Format: 'HH:mm'
  
  // Location
  location_name?: string; // e.g., "BKDN"
  location_address?: string;
  latitude?: number;
  longitude?: number;
  
  // Event Details
  event_type?: 'event' | 'reminder' | 'task' | string; // e.g., "reminder"
  weather?: string | Record<string, any>; // Depends on how you store weather data
  color?: string; // Hex color, e.g., "#5865F2"
  
  // Recurrence (For repeating events)
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly' | string;
  recurrence_end_date?: string; // Format: 'YYYY-MM-DD'
  parent_event_id?: string; // ID of the original event if this is a recurring instance
  
  // Interactions
  reminder_minutes?: number; // e.g., 30 (minutes before the event)
  rsvp_enabled?: boolean;
  rsvp_responses?: Record<string, 'attending' | 'declined' | 'maybe'> | any[]; // Maps user email/id to their RSVP status
  attendees?: string[]; // Array of user emails or IDs attending
  
  // Integrations
  google_calendar_id?: string;

  // Standard Timestamps
  created_at?: string;
  updated_at?: string;
}

// Payload for POST /v1/events
// Omits auto-generated fields like id and timestamps
export interface CreateEventPayload extends Omit<Event, 'id' | 'created_at' | 'updated_at'> {}

// Payload for PATCH /v1/events/:eventId
// Makes all fields optional for partial updates
export interface UpdateEventPayload extends Partial<CreateEventPayload> {}