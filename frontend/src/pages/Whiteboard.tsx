import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Pencil, Eraser, Trash2, Download, 
  Users, Sparkles, Send, Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PresenceIndicator from '../components/presence/PresenceIndicator';
import { toast } from "sonner";

// ✅ Import Real APIs & Socket
import { userApi } from "@/api/user.api";
import { groupApi } from "@/api/group.api";
import { whiteboardApi } from "@/api/whiteboard.api";
import { socket } from '@/lib/socket'; 
import type { WhiteboardStroke, StrokeData, Point } from "@/types/whiteboard";

// Dùng cho AI Generate
import { mockApiClient } from '@/lib/mockApiClient';

const colors = ['#000000', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

export default function Whiteboard() {
  const [user, setUser] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Dùng useRef để tăng tốc độ vẽ lên tối đa (tránh render lại component liên tục)
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const initialGroup = urlParams.get('group');

  useEffect(() => {
    loadUser();
    if (initialGroup) setSelectedGroup(initialGroup);
  }, []);

  const loadUser = async () => {
    try {
      const userData = await userApi.getMe();
      setUser(userData);
    } catch (e) {
      window.location.href = '/login';
    }
  };

  const { data: groups = [] } = useQuery({
    queryKey: ['groups', user?.email],
    queryFn: async () => {
      const allGroups = await groupApi.list();
      return allGroups.filter((g: any) => g.members?.includes(user?.email || '') || g.owner === user?.email);
    },
    enabled: !!user?.email,
  });

  const { data: strokes = [], isLoading: isStrokesLoading } = useQuery<WhiteboardStroke[]>({
    queryKey: ['whiteboard', selectedGroup],
    queryFn: async () => {
      console.log(`📡 [GET] Đang lấy dữ liệu bảng vẽ cho Group: ${selectedGroup}`);
      const all = await whiteboardApi.list(selectedGroup, 'main');
      console.log(`✅ [GET] Đã lấy thành công ${all.length} nét vẽ.`);
      return all.sort((a, b) => {
        const dateA = new Date(a.created_at || a.created_date || 0).getTime();
        const dateB = new Date(b.created_at || b.created_date || 0).getTime();
        return dateA - dateB;
      });
    },
    enabled: !!selectedGroup,
  });

  const saveStrokeMutation = useMutation({
    mutationFn: async (strokeData: StrokeData) => {
      if (!user) return;
      console.log(`📤 [POST] Đang lưu nét vẽ mới lên Server...`);
      await whiteboardApi.create({
        group_id: selectedGroup,
        whiteboard_id: 'main',
        author_email: user.email,
        author_name: user.full_name || user.name || user.firstName || user.email.split('@')[0],
        stroke_data: strokeData
      });
    },
    onSuccess: () => {
      console.log(`✅ [POST] Lưu nét vẽ thành công!`);
    },
  });

  const clearWhiteboardMutation = useMutation({
    mutationFn: async () => {
      console.log(`🗑️ [DELETE] Đang yêu cầu xóa trắng bảng vẽ...`);
      await whiteboardApi.clear(selectedGroup, 'main');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteboard', selectedGroup] });
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      toast.success('Whiteboard cleared');
    },
  });

  // ✨ LẮNG NGHE SOCKET.IO
  useEffect(() => {
    if (!user || !selectedGroup) return;
    
    if (!socket.connected) {
      console.log('🔌 [Socket] Đang kết nối lại...');
      socket.connect();
    }

    console.log(`🚪 [Socket] Đang tham gia phòng vẽ: ${selectedGroup}`);
    socket.emit('join_group', selectedGroup);

    const handleReceiveStroke = (newStroke: WhiteboardStroke) => {
      // Không vẽ đè nếu là nét do chính mình vẽ
      if (newStroke.author_email === user.email) return;
      
      console.log(`🎨 [Socket] Nhận được nét vẽ mới từ: ${newStroke.author_email}`);
      queryClient.setQueryData(['whiteboard', selectedGroup], (old: WhiteboardStroke[] | undefined) => {
        const current = old || [];
        if (current.some(s => (s._id || s.id) === (newStroke._id || newStroke.id))) return current;
        return [...current, newStroke];
      });
    };

    const handleWhiteboardCleared = ({ groupId, whiteboardId }: { groupId: string, whiteboardId: string }) => {
      if (groupId === selectedGroup && (whiteboardId === 'main' || !whiteboardId)) {
        console.log(`🧹 [Socket] Bảng vẽ đã bị xóa trắng!`);
        queryClient.setQueryData(['whiteboard', selectedGroup], () => []);
        const canvas = canvasRef.current;
        if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        toast.info("Someone cleared the whiteboard");
      }
    };

    socket.on('receive_stroke', handleReceiveStroke);
    socket.on('whiteboard_cleared', handleWhiteboardCleared);

    return () => {
      socket.emit('leave_group', selectedGroup);
      socket.off('receive_stroke', handleReceiveStroke);
      socket.off('whiteboard_cleared', handleWhiteboardCleared);
    };
  }, [selectedGroup, user, queryClient]);

  // ✨ HÀM VẼ (Render Data từ MongoDB)
  const drawStroke = (ctx: CanvasRenderingContext2D, rawData: StrokeData | string) => {
    let strokeData: StrokeData;
    
    // An toàn kiểm tra kiểu dữ liệu
    if (typeof rawData === 'string') {
      try {
        strokeData = JSON.parse(rawData);
      } catch (e) {
        console.error("Lỗi Parse JSON:", e);
        return;
      }
    } else {
      strokeData = rawData;
    }

    if (!strokeData) return;

    ctx.globalCompositeOperation = 'source-over';

    // 1. Vẽ Ảnh
    if ((strokeData.type === 'user-image' || strokeData.type === 'ai-image' || strokeData.tool === 'image') && strokeData.imageUrl && strokeData.imageData) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (strokeData.imageData) ctx.drawImage(img, strokeData.imageData.x, strokeData.imageData.y, strokeData.imageData.width, strokeData.imageData.height);
      };
      img.src = strokeData.imageUrl;
      return;
    }

    // 2. Vẽ Chữ
    if (strokeData.type === 'text' || strokeData.tool === 'text') {
      ctx.font = `${strokeData.fontSize || 40}px Arial`;
      ctx.fillStyle = strokeData.color || '#000000';
      ctx.fillText(strokeData.text || '', strokeData.x || 0, strokeData.y || 0);
      return;
    }

    // 3. Vẽ Khối Hình Chữ Nhật
    if (strokeData.type === 'rectangle' || strokeData.tool === 'shape') {
      ctx.strokeStyle = strokeData.color || '#000000';
      ctx.lineWidth = strokeData.lineWidth || 2;
      ctx.strokeRect(strokeData.x || 0, strokeData.y || 0, strokeData.width || 0, strokeData.height || 0);
      return;
    }

    // 4. Vẽ Nét Bút
    if (!strokeData.points || !Array.isArray(strokeData.points) || strokeData.points.length < 2) return;

    ctx.strokeStyle = strokeData.color || '#000000';
    ctx.lineWidth = strokeData.lineWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (strokeData.tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';

    ctx.beginPath();
    ctx.moveTo(strokeData.points[0].x, strokeData.points[0].y);
    for (let i = 1; i < strokeData.points.length; i++) {
      ctx.lineTo(strokeData.points[i].x, strokeData.points[i].y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };

  // Render lại bảng vẽ mỗi khi danh sách `strokes` thay đổi
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Xử lý dữ liệu an toàn một lượt
    const safeStrokes = strokes.map(stroke => {
      try {
        return typeof stroke.stroke_data === 'string' ? JSON.parse(stroke.stroke_data) : stroke.stroke_data;
      } catch (e) { return null; }
    }).filter(Boolean);

    // Lớp 1: Vẽ nền (Ảnh, chữ, hình khối)
    safeStrokes.forEach(data => {
      if (data.type === 'user-image' || data.type === 'ai-image' || data.type === 'text' || data.type === 'rectangle' || data.tool === 'image' || data.tool === 'text' || data.tool === 'shape') {
        drawStroke(ctx, data);
      }
    });

    // Lớp 2: Vẽ nét bút đè lên trên
    safeStrokes.forEach(data => {
      if (!data.type || data.type === 'stroke' || data.tool === 'pen' || data.tool === 'eraser') {
        drawStroke(ctx, data);
      }
    });
  }, [strokes]);

  // ✨ Tính toán Tọa độ chuột bù trừ Scale (Vì CSS đang để w-full)
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const point = getCoordinates(e);
    currentPointsRef.current = [point];

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    
    const point = getCoordinates(e);
    currentPointsRef.current.push(point);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
      ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentPointsRef.current.length > 1) {
      console.log(`🖱️ [UI] Vừa nhấc chuột, chuẩn bị lưu nét vẽ...`);
      const newStroke: StrokeData = {
        type: 'stroke',
        points: currentPointsRef.current,
        color: tool === 'eraser' ? '#FFFFFF' : color,
        lineWidth: tool === 'eraser' ? lineWidth * 3 : lineWidth,
        tool
      };

      // Gọi API Lưu lên MongoDB
      saveStrokeMutation.mutate(newStroke);
    }
    
    currentPointsRef.current = [];
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `whiteboard-${new Date().getTime()}.png`;
    link.href = url;
    link.click();
    toast.success('Whiteboard downloaded!');
  };

  const generateAIDrawing = async () => {
    if (!aiPrompt.trim()) return;
    try {
      setIsGenerating(true);
      toast.loading('AI is generating your drawing...');
      
      const { url } = await (mockApiClient.integrations.Core as any).GenerateImage({
        prompt: `Simple, clean whiteboard-style drawing: ${aiPrompt}. White background, clear lines, easy to understand.`
      });

      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not found");

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Context not found");
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
          const x = (canvas.width - img.width * scale) / 2;
          const y = (canvas.height - img.height * scale) / 2;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });

      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (canvas.width - scaledWidth) / 2;
      const y = (canvas.height - scaledHeight) / 2;

      await saveStrokeMutation.mutateAsync({
        type: 'ai-image',
        imageUrl: url,
        imageData: { x, y, width: scaledWidth, height: scaledHeight },
        color: '#000000',
        lineWidth: 1,
        tool: 'ai'
      });

      setAiPrompt('');
      toast.dismiss();
      toast.success('AI drawing added to whiteboard!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate AI drawing');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Whiteboard</h1>
          <p className="text-slate-500 mt-1">Collaborate visually with your group in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedGroup && user && (
            <PresenceIndicator groupId={selectedGroup} page="whiteboard" user={user} />
          )}
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-48 rounded-xl bg-white">
              <SelectValue placeholder="Select Group" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group: any) => (
                <SelectItem key={group._id || group.id} value={group.id || group._id}>{group.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedGroup ? (
        <Card className="p-12 text-center border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-3xl">
          <Users className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Select a group to start</h3>
          <p className="text-slate-500">Choose a group to collaborate on a whiteboard together</p>
        </Card>
      ) : (
        <div className="space-y-4">
          
          {/* AI Drawing Assistant */}
          {/* <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 shadow-sm rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <Input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isGenerating && generateAIDrawing()}
                  placeholder="Describe what you want the AI to draw... (e.g., 'a cat wearing a hat')"
                  className="rounded-xl border-purple-200 bg-white/80 focus-visible:ring-purple-400"
                  disabled={isGenerating}
                />
                <Button
                  onClick={generateAIDrawing}
                  disabled={!aiPrompt.trim() || isGenerating}
                  className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md hover:shadow-lg transition-all"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card> */}

          {/* Toolbar */}
          <Card className="p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-2">
                <Button variant={tool === 'pen' ? 'default' : 'outline'} size="icon" onClick={() => setTool('pen')} className={`rounded-xl ${tool === 'pen' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600'}`}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant={tool === 'eraser' ? 'default' : 'outline'} size="icon" onClick={() => setTool('eraser')} className={`rounded-xl ${tool === 'eraser' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600'}`}>
                  <Eraser className="w-4 h-4" />
                </Button>
              </div>

              <div className="h-8 w-px bg-slate-200" />

              <div className="flex gap-2">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'scale-125 border-slate-300 shadow-sm' : 'border-transparent hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="h-8 w-px bg-slate-200" />

              <div className="flex items-center gap-3 min-w-32">
                <Label className="text-sm font-medium text-slate-600">Size</Label>
                <Slider value={[lineWidth]} onValueChange={(v) => setLineWidth(v[0])} min={1} max={20} step={1} className="flex-1 cursor-pointer" />
                <span className="text-sm font-semibold text-slate-700 w-6 text-center">{lineWidth}</span>
              </div>

              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={downloadCanvas} className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
                <Button variant="destructive" onClick={() => clearWhiteboardMutation.mutate()} className="rounded-xl bg-red-500 hover:bg-red-600 shadow-sm">
                  <Trash2 className="w-4 h-4 mr-2" /> Clear
                </Button>
              </div>
            </div>
          </Card>

          {/* Canvas Wrapper */}
          <Card className="p-2 bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden relative">
            {isStrokesLoading && (
              <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={1200}
              height={700}
              className="rounded-2xl cursor-crosshair bg-white w-full touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </Card>
        </div>
      )}
    </div>
  );
}