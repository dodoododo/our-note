import axiosClient from "./axiosClient";
import type { TaskList, CreateTaskListPayload, UpdateTaskListPayload } from "@/types/task";

export const taskListApi = {
  list: async (): Promise<TaskList[]> => {
    const response: any = await axiosClient.get<TaskList[]>('/task-lists');
    const data = response.data || response;
    return Array.isArray(data) ? data : (data.results || []);
  },

  create: async (data: CreateTaskListPayload): Promise<TaskList> => {
    const response: any = await axiosClient.post<TaskList>('/task-lists', data);
    return response.data || response;
  },

  update: async (id: string, data: UpdateTaskListPayload): Promise<TaskList> => {
    const response: any = await axiosClient.patch<TaskList>(`/task-lists/${id}`, data);
    return response.data || response;
  },

  delete: async (id: string): Promise<any> => {
    const response: any = await axiosClient.delete(`/task-lists/${id}`);
    return response.data || response;
  }
};