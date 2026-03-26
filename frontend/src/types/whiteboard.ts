// src/types/whiteboard.ts

export interface Point {
  x: number;
  y: number;
}

export interface ImageData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StrokeData {
  type?: 'user-image' | 'ai-image' | 'text' | 'rectangle' | 'stroke';
  tool: string;
  
  // Dành cho nét vẽ (Pen/Eraser)
  points?: Point[];
  color?: string;
  lineWidth?: number;
  
  // Dành cho Image
  imageUrl?: string;
  imageData?: ImageData;
  
  // Dành cho Text
  text?: string;
  x?: number;
  y?: number;
  fontSize?: number;
  
  // Dành cho Shape (Rectangle)
  width?: number;
  height?: number;
}

export interface WhiteboardStroke {
  _id?: string;
  id?: string;
  group_id: string;
  whiteboard_id: string;
  author_email: string;
  author_name?: string;
  created_at?: string; 
  created_date?: string;
  stroke_data: StrokeData | string; // Backend có thể trả về string (JSON) hoặc Object
}