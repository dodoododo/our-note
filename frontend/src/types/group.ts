// src/types/group.ts

export type GroupType = 'family' | 'couple' | 'friends' | 'work';
export type GroupRole = 'admin' | 'member';

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  avatar_url?: string;
  members: string[]; // Array of emails
  
  // Map: Key là email, Value là tên/role
  member_names: Record<string, string>; 
  member_roles: Record<string, GroupRole>;
  
  owner: string; // Email of owner
  couple_start_date?: string; // Date string ISO
  description?: string;
  color?: string;
  
  // Settings
  notifications_enabled: boolean;
  notify_on_task_assignment: boolean;
  notify_on_event_changes: boolean;
  notify_on_new_notes: boolean;
  
  is_private: boolean;
  allow_member_invites: boolean;

  createdAt?: string;
  updatedAt?: string;
}

// Payload khi tạo mới Group
export interface CreateGroupPayload {
  name: string;
  type: GroupType;
  description?: string;
  members?: string[]; // Có thể mời luôn lúc tạo
  couple_start_date?: string;
}

// Payload khi update
export interface UpdateGroupPayload extends Partial<Omit<Group, 'id' | 'owner' | 'createdAt' | 'updatedAt'>> {}