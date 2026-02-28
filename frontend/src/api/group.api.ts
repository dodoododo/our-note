import axiosClient from "./axiosClient";
import type { Group, CreateGroupPayload, UpdateGroupPayload } from "@/types/group";

export const groupApi = {
  // --- Group Operations ---
  
  // List all groups for the current user
  list: async () => {
    const response: any = await axiosClient.get<Group[]>('/groups');
    // 👇 FIX: Kiểm tra nếu response là mảng thì trả về luôn, nếu là object bọc thì lấy .data
    // Hoặc trả về mảng rỗng nếu null
    const data = response.data || response;
    return Array.isArray(data) ? data : []; 
  },

  // Get single group details
  get: async (groupId: string) => {
    const response: any = await axiosClient.get<Group>(`/groups/${groupId}`);
    const data = response.data || response;
    // Map created_date cho khớp frontend
    return { ...data, created_date: data.createdAt };
  },

  // Create a new group
  create: async (data: CreateGroupPayload) => {
    const response: any = await axiosClient.post<Group>('/groups', data);
    return response.data || response;
  },

  // Update a group
  update: async (groupId: string, data: UpdateGroupPayload | any) => {
    const response: any = await axiosClient.patch<Group>(`/groups/${groupId}`, data);
    return response.data || response;
  },

  // Delete a group
  delete: async (groupId: string) => {
    return axiosClient.delete(`/groups/${groupId}`);
  },

  // --- Related Entities ---

  getEvents: async (groupId: string) => {
    const response: any = await axiosClient.get(`/events?group_id=${groupId}`);
    const data = response.data || response;
    return Array.isArray(data) ? data : [];
  },

  getTasks: async (groupId: string) => {
    const response: any = await axiosClient.get(`/tasks?group_id=${groupId}&completed=false`);
    const data = response.data || response;
    return Array.isArray(data) ? data : [];
  },

  getNotes: async (groupId: string) => {
    const response: any = await axiosClient.get(`/notes?group_id=${groupId}`);
    const data = response.data || response;
    return Array.isArray(data) ? data : [];
  },

  // --- Invitations ---
  sendInvitation: async (data: { group_id: string; invitee_email: string; [key:string]: any }) => {
    const response: any = await axiosClient.post('/invitations', data);
    return response.data || response;
  },

  // --- File Upload ---
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response: any = await axiosClient.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data || response;
  }
};