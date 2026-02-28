import axiosClient from "./axiosClient";
import type { Note, CreateNotePayload, UpdateNotePayload } from "@/types/note";

export const noteApi = {
  /**
   * Get all notes for the authenticated user
   */
  list: async (): Promise<Note[]> => {
    const response: any = await axiosClient.get<Note[]>('/notes');
    
    // Handle both direct array responses and paginated { results: [...] } responses
    const data = response.data || response;
    return Array.isArray(data) ? data : (data.results || []);
  },

  /**
   * Get a single note by its ID
   */
  get: async (id: string): Promise<Note> => {
    const response: any = await axiosClient.get<Note>(`/notes/${id}`);
    return response.data || response;
  },

  /**
   * Create a new note
   */
  create: async (data: CreateNotePayload): Promise<Note> => {
    const response: any = await axiosClient.post<Note>('/notes', data);
    return response.data || response;
  },

  /**
   * Update an existing note (e.g., editing content, pinning, changing color)
   */
  update: async (id: string, data: UpdateNotePayload): Promise<Note> => {
    const response: any = await axiosClient.patch<Note>(`/notes/${id}`, data);
    return response.data || response;
  },

  /**
   * Delete a note
   */
  delete: async (id: string): Promise<any> => {
    const response: any = await axiosClient.delete(`/notes/${id}`);
    return response.data || response;
  }
};