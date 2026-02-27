export interface Invitation {
  id: string; // Mapped from MongoDB '_id'
  
  // Group Details
  group_id: string;
  group_name: string;
  
  // Inviter Details (The person sending the invite)
  inviter_email: string;
  inviter_name: string;
  
  // Invitee Details (The person receiving the invite)
  invitee_email: string;
  
  // Invitation State
  status: 'pending' | 'accepted' | 'declined';
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

/**
 * Payload for POST /v1/invitations
 * Usually, the backend automatically figures out the `inviter_email`, `inviter_name`, 
 * and `group_name` from the Auth Token and Database. You normally only need to send 
 * the group ID and the email of the person you are inviting.
 */
export interface CreateInvitationPayload {
  group_id: string;
  invitee_email: string;
  
  // Optional: In case your backend requires the frontend to send these explicitly
  group_name?: string; 
}

/**
 * Payload for PATCH /v1/invitations/:id
 * Used when the invitee clicks "Accept" or "Decline"
 */
export interface UpdateInvitationPayload {
  status: 'accepted' | 'declined';
}