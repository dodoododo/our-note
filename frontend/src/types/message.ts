// src/types/chat.ts (or message.ts)

/**
 * Defines the allowed types of messages.
 */
export type MessageType = 'text' | 'system';

/**
 * Core Message Interface (Database/Response Model)
 */
export interface Message {
  id?: string;            // Frontend usage
  _id?: string;          // MongoDB standard ID
  
  group_id: string;      // ID of the group
  sender_email: string;  // Email of message sender
  sender_name?: string;  // Display name of sender
  content: string;       // Message content
  
  read_by?: string[];    // Array of emails who read the message (Default: [])
  message_type?: MessageType; // Type of message (Default: 'text')

  // Standard timestamps usually returned by APIs
  created_at?: string;
  updated_at?: string;
}

/**
 * Payload for API POST /v1/messages
 * Contains only the required fields to send a new message.
 */
export interface CreateMessagePayload {
  group_id: string;
  sender_email: string;
  content: string;
  
  sender_name?: string;
  message_type?: MessageType;
}

/**
 * Socket/Real-time Typing Status Payload
 */
export interface TypingStatus {
  group_id: string;      // ID of the group
  user_email: string;    // Email of typing user
  user_name?: string;    // Name of typing user
  is_typing?: boolean;   // Whether user is typing (Default: true)
}