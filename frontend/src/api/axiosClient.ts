import axios from 'axios';
import { toast } from 'sonner'; // Đảm bảo bạn có import thư viện thông báo

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      
      // Thông báo cho người dùng biết lý do bị văng
      toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");

      // Chỉ ép chuyển hướng nếu đang không ở trang auth hoặc landing
      const currentPath = window.location.pathname;
      if (currentPath !== '/auth' && currentPath !== '/landing') {
        window.location.href = '/auth'; 
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;