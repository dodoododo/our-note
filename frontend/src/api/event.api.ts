import axiosClient from "./axiosClient";
import type { Event, CreateEventPayload, UpdateEventPayload } from "@/types/event";

export const eventApi = {
  // List all events (you can pass query params like group_id if your backend supports it)
  list: async () => {
    const response: any = await axiosClient.get<Event[]>('/events');
    const data = response.data || response;
    return Array.isArray(data) ? data : [];
  },

  // Get a single event
  get: async (id: string) => {
    const response: any = await axiosClient.get<Event>(`/events/${id}`);
    return response.data || response;
  },

  // Create an event
  create: async (data: CreateEventPayload) => {
    const response: any = await axiosClient.post<Event>('/events', data);
    return response.data || response;
  },

  // Update an event
  update: async (id: string, data: UpdateEventPayload) => {
    const response: any = await axiosClient.patch<Event>(`/events/${id}`, data);
    return response.data || response;
  },

  // Delete an event
  delete: async (id: string) => {
    return axiosClient.delete(`/events/${id}`);
  }
};