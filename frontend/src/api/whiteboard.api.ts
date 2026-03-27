// src/api/whiteboard.api.ts
import axiosClient from './axiosClient';
import type { WhiteboardStroke } from '@/types/whiteboard';

export const whiteboardApi = {
  // Lấy toàn bộ nét vẽ của 1 group
  list: async (groupId: string, whiteboardId: string = 'main'): Promise<WhiteboardStroke[]> => {
    console.log(`📡 [API GET] Đang lấy dữ liệu bảng vẽ cho Group: ${groupId}`);
    // Bỏ destructuring { data }, lấy thẳng response
    const response = await axiosClient.get(`/whiteboards/${groupId}/${whiteboardId}`);
    
    // An toàn: Nếu interceptor trả thẳng array thì xài luôn, nếu bọc trong data thì .data
    const data = response.data !== undefined ? response.data : response;
    
    console.log(`✅ [API GET] Đã lấy thành công ${data?.length || 0} nét vẽ.`);
    return data;
  },

  // Tạo nét vẽ/ảnh/text mới
  create: async (payload: Partial<WhiteboardStroke>): Promise<WhiteboardStroke> => {
    console.log(`📤 [API POST] Đang lưu nét vẽ mới lên Server...`);
    const response = await axiosClient.post(`/whiteboards`, payload);
    const data = response.data !== undefined ? response.data : response;
    return data;
  },

  // Xóa toàn bộ bảng (Clear)
  clear: async (groupId: string, whiteboardId: string = 'main') => {
    console.log(`🗑️ [API DELETE] Đang yêu cầu xóa trắng bảng vẽ...`);
    const response = await axiosClient.delete(`/whiteboards/${groupId}/${whiteboardId}`);
    const data = response.data !== undefined ? response.data : response;
    return data;
  },
  // Thêm hàm này vào dưới hàm create và clear
  undo: async (strokeId: string) => {
    console.log(`↩️ [API DELETE] Đang Undo nét vẽ: ${strokeId}`);
    const response = await axiosClient.delete(`/whiteboards/undo/${strokeId}`);
    const data = response.data !== undefined ? response.data : response;
    return data;
  },
};