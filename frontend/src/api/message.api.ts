import apiClient from './axiosClient'; 
import type { Message, CreateMessagePayload } from '@/types/message';

export const messageApi = {
  /**
   * Fetch messages. 
   */
  list: async (groupId?: string): Promise<Message[]> => {
    const params = groupId ? { group_id: groupId } : {};
    // Pass <Message[]> to .get so TS knows the interceptor returns the array
    return await apiClient.get<Message[]>('/messages', { params }) as unknown as Message[];
  },

  /**
   * Send a new message
   */
  create: async (data: CreateMessagePayload): Promise<Message> => {
    // Pass <Message> to .post so TS knows the interceptor returns a single Message
    return await apiClient.post<Message>('/messages', data) as unknown as Message;
  },

  // src/api/message.api.ts
  markAsRead: async (groupId: string, userEmail: string): Promise<void> => {
    // Truyền userEmail vào body của POST request
    return await apiClient.post(`/messages/group/${groupId}/read`, { userEmail });
  },

  /**
   * Delete a message
   */
  delete: async (messageId: string): Promise<void> => {
    return await apiClient.delete(`/messages/${messageId}`);
  }
};