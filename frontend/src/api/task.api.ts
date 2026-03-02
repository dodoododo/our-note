import axiosClient from "./axiosClient";
import type { Task, CreateTaskPayload, UpdateTaskPayload } from "@/types/task";

export const taskApi = {
  /**
   * Get all tasks (can be filtered by group_id on the backend)
   */
  list: async (): Promise<Task[]> => {
    const response: any = await axiosClient.get<Task[]>('/tasks');
    const data = response.data || response;
    return Array.isArray(data) ? data : (data.results || []);
  },

  /**
   * Create a new task
   */
  create: async (data: CreateTaskPayload): Promise<Task> => {
    const response: any = await axiosClient.post<Task>('/tasks', data);
    return response.data || response;
  },

  /**
   * Update an existing task
   */
  update: async (id: string, data: UpdateTaskPayload): Promise<Task> => {
    const response: any = await axiosClient.patch<Task>(`/tasks/${id}`, data);
    return response.data || response;
  },

  /**
   * Delete a task
   */
  delete: async (id: string): Promise<any> => {
    const response: any = await axiosClient.delete(`/tasks/${id}`);
    return response.data || response;
  }
};