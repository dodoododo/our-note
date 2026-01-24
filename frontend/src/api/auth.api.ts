import axiosClient from "./axiosClient";

// Định nghĩa kiểu dữ liệu nếu cần
interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export const authApi = {
  login: (data: LoginPayload) => {
    return axiosClient.post('/auth/login', data);
  },

  register: (data: RegisterPayload) => {
    return axiosClient.post('/auth/register', data);
  },

  getMe: () => {
    return axiosClient.get('/users/me');
  }
};