import axiosClient from "./axiosClient";
import type { Invitation, CreateInvitationPayload, UpdateInvitationPayload } from "@/types/invitation";

export const invitationApi = {
  // Get all invitations for the currently logged-in user
  listMyInvitations: async () => {
    // The backend should ideally filter by the logged-in user's token
    const response: any = await axiosClient.get<Invitation[]>('/invitations');
    const data = response.data || response;
    return Array.isArray(data) ? data : [];
  },

  // Create an invitation (Used in Group Settings or Group Detail)
  create: async (data: CreateInvitationPayload) => {
    const response: any = await axiosClient.post<Invitation>('/invitations', data);
    return response.data || response;
  },

  // Update an invitation status (Accept/Decline)
  updateStatus: async (id: string, data: UpdateInvitationPayload) => {
    const response: any = await axiosClient.patch<Invitation>(`/invitations/${id}`, data);
    return response.data || response;
  },

  // (Optional) Delete an invitation
  delete: async (id: string) => {
    return axiosClient.delete(`/invitations/${id}`);
  }
};