export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'archived' | string;
export type TaskLabel = 'low' | 'normal' | 'high' | 'urgent' | string;

export interface Task {
  id?: string;   // Dùng ở Frontend
  _id?: string;  // Dùng mặc định của MongoDB (để tránh lỗi undefined)

  // Core Info
  title: string;
  description?: string;
  group_id: string;
  
  // Organization (Dành cho Kanban Board)
  list_name: string; // Tên cột (VD: 'Backlog', 'In progress', 'To Do')
  status: TaskStatus;
  label: TaskLabel;
  order?: number; // Số thứ tự để xử lý Drag & Drop (kéo thả)

  // Assignment & Dates
  assigned_to: string[]; // Mảng chứa ID hoặc Email của những người được giao
  due_date?: string | null; // Chuỗi ngày tháng ISO (VD: '2026-02-18')
  
  // Progress Tracking
  completed: boolean;
  completion_percentage: number; // 0 - 100

  // Relational Tasks (Nâng cao)
  parent_task_id?: string | null; // ID của Task cha (nếu đây là sub-task)
  depends_on: string[]; // Mảng chứa ID của các Task phải hoàn thành trước task này

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

/**
 * Payload cho API POST /v1/tasks
 */
export interface CreateTaskPayload {
  title: string;
  group_id: string;
  list_name: string; // Thường khi tạo mới sẽ phải chọn cột để thả vào
  
  // Các trường dưới đây có thể không bắt buộc lúc mới tạo
  description?: string;
  status?: TaskStatus;
  label?: TaskLabel;
  order?: number;
  assigned_to?: string[];
  due_date?: string | null;
  completed?: boolean;
  completion_percentage?: number;
  parent_task_id?: string | null;
  depends_on?: string[];
}

/**
 * Payload cho API PATCH /v1/tasks/:id
 * Tất cả đều là optional vì khi update ta chỉ gửi những trường cần sửa
 */
export interface UpdateTaskPayload {
  group_id?: string;
  title?: string;
  description?: string;
  list_name?: string;
  status?: TaskStatus;
  label?: TaskLabel;
  order?: number;
  assigned_to?: string[];
  due_date?: string | null;
  completed?: boolean;
  completion_percentage?: number;
  parent_task_id?: string | null;
  depends_on?: string[];
}

// ... (giữ nguyên các type của Task ở trên)

export interface TaskList {
  id?: string;
  _id?: string;
  name: string;
  group_id: string;
  order: number;
  color: string; // Thêm trường màu sắc
  
  created_at?: string;
  updated_at?: string;
}

export interface CreateTaskListPayload {
  name: string;
  group_id: string;
  order: number;
  color?: string; // Tùy chọn, backend có thể set default
}

export interface UpdateTaskListPayload {
  name?: string;
  order?: number;
  color?: string;
}