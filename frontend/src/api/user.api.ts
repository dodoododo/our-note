import axiosClient from "./axiosClient";
import type { User } from "@/types/user";

export const userApi = {
  // Lấy thông tin bản thân
  getMe: () => {
    return axiosClient.get<User>('/users/me');
  },

  // Cập nhật thông tin (Name, Theme, Avatar, Password...)
//   updateMe: (data: UpdateUserPayload) => {
//     return axiosClient.patch<User>('/users/me', data);
//   }
};