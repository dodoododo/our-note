export interface User {
  id: string;
  email: string;
  name: string; // Backend trả về "name", bạn map thành "full_name" ở FE hoặc sửa type này thành "name" tùy logic
  // name?: string;     // Thêm trường này nếu API trả về "name"
  profile_pic_url?: string;
  theme_hue?: number;
  // Các trường khác nếu cần...
}

/**
 * Payload dùng để gửi lên API update (PATCH /users/me)
 * Dùng Partial để tất cả các trường đều là optional (có thể gửi 1 hoặc nhiều trường)
 */
export interface UpdateUserPayload {
  full_name?: string; // Hoặc 'name' tùy vào body bạn gửi lên
  name?: string;
  password?: string;
  theme_hue?: number;
  profile_pic_url?: string;
  email?: string;
}