import axios from 'axios';
import { AxiosError } from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Lấy từ .env
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor 1: Tự động gắn Token vào mọi request (nếu có)
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor 2: Xử lý phản hồi (Response) & Lỗi (Error)
axiosClient.interceptors.response.use(
  (response) => {
    // Trả về data trực tiếp, bớt đi 1 lớp .data của axios
    return response.data;
  },
  (error) => {
    // Xử lý lỗi chung (Ví dụ: Token hết hạn -> Tự động logout)
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      // window.location.href = '/auth'; // Tùy chọn: đá về trang login
    }
    return Promise.reject(error);
  }
);

export default axiosClient;