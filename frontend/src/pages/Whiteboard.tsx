import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Pencil, Eraser, Trash2, Download, 
  Users, Sparkles, Send, Loader2, Square, Circle, Undo2, Type
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

import { userApi } from "@/api/user.api";
import { groupApi } from "@/api/group.api";
import { whiteboardApi } from "@/api/whiteboard.api";
import { socket } from '@/lib/socket'; 
import type { WhiteboardStroke, StrokeData, Point } from "@/types/whiteboard";
import { mockApiClient } from '@/lib/mockApiClient';

const colors = ['#000000', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

interface ActiveImage {
  img: HTMLImageElement;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ActiveText {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
}

export default function Whiteboard() {
  const [user, setUser] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [tool, setTool] = useState('pen'); 
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageTrigger, setImageTrigger] = useState(false);

  const [textInputPos, setTextInputPos] = useState<{ x: number, y: number, canvasX: number, canvasY: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState('');

  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const startPointRef = useRef<Point | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const savedCanvasStateRef = useRef<ImageData | null>(null);
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});

  const activeImageRef = useRef<ActiveImage | null>(null);
  const activeTextRef = useRef<ActiveText | null>(null);
  const interactionRef = useRef<'none' | 'drag' | 'resize' | 'drag_text'>('none');
  const dragOffsetRef = useRef<{x: number, y: number}>({x: 0, y: 0});

  // ✨ FIX: Ref dùng để nhận diện khu vực bảng vẽ
  const containerRef = useRef<HTMLDivElement>(null);
  
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
      const all = await whiteboardApi.list(selectedGroup, 'main');
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
      await whiteboardApi.create({
        group_id: selectedGroup,
        whiteboard_id: 'main',
        author_email: user.email,
        author_name: user.full_name || user.name || user.firstName || user.email.split('@')[0],
        stroke_data: strokeData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteboard', selectedGroup] });
    },
  });

  const clearWhiteboardMutation = useMutation({
    mutationFn: async () => {
      await whiteboardApi.clear(selectedGroup, 'main');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteboard', selectedGroup] });
      activeImageRef.current = null;
      activeTextRef.current = null;
      redrawCanvas(strokes);
      toast.success('Whiteboard cleared');
    },
  });

  const undoMutation = useMutation({
    mutationFn: async (strokeId: string) => {
      await whiteboardApi.undo(strokeId);
      return strokeId;
    },
    onSuccess: (deletedStrokeId) => {
      queryClient.setQueryData(['whiteboard', selectedGroup], (old: WhiteboardStroke[] | undefined) => {
        return (old || []).filter(s => (s._id || s.id) !== deletedStrokeId);
      });
    },
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault(); 
        if (!user || undoMutation.isPending) return;

        const myStrokes = strokes.filter(s => s.author_email === user.email);
        if (myStrokes.length > 0) {
          const lastStroke = myStrokes[myStrokes.length - 1];
          const strokeId = lastStroke._id || lastStroke.id;
          if (strokeId) undoMutation.mutate(strokeId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [strokes, user, selectedGroup, undoMutation.isPending]);

  useEffect(() => {
    if (!user || !selectedGroup) return;
    if (!socket.connected) socket.connect();

    socket.emit('join_group', selectedGroup);

    const handleReceiveStroke = (newStroke: WhiteboardStroke) => {
      if (newStroke.author_email === user.email) return;
      queryClient.setQueryData(['whiteboard', selectedGroup], (old: WhiteboardStroke[] | undefined) => {
        const current = old || [];
        if (current.some(s => (s._id || s.id) === (newStroke._id || newStroke.id))) return current;
        return [...current, newStroke];
      });
    };

    const handleWhiteboardCleared = ({ groupId, whiteboardId }: { groupId: string, whiteboardId: string }) => {
      if (groupId === selectedGroup && (whiteboardId === 'main' || !whiteboardId)) {
        queryClient.setQueryData(['whiteboard', selectedGroup], () => []);
        const canvas = canvasRef.current;
        if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        toast.info("Someone cleared the whiteboard");
      }
    };

    const handleStrokeDeleted = (strokeId: string) => {
      queryClient.setQueryData(['whiteboard', selectedGroup], (old: WhiteboardStroke[] | undefined) => {
        return (old || []).filter(s => (s._id || s.id) !== strokeId);
      });
    };

    socket.on('receive_stroke', handleReceiveStroke);
    socket.on('whiteboard_cleared', handleWhiteboardCleared);
    socket.on('stroke_deleted', handleStrokeDeleted);

    return () => {
      socket.emit('leave_group', selectedGroup);
      socket.off('receive_stroke', handleReceiveStroke);
      socket.off('whiteboard_cleared', handleWhiteboardCleared);
      socket.off('stroke_deleted', handleStrokeDeleted);
    };
  }, [selectedGroup, user, queryClient]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!selectedGroup || !user) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (!file) continue;

          if (activeImageRef.current) commitActiveImage();
          if (activeTextRef.current) commitActiveText();

          toast.loading("Pasting image...");
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = canvasRef.current;
              if (!canvas) return;

              let scale = 1;
              if (img.width > canvas.width / 2 || img.height > canvas.height / 2) {
                scale = Math.min((canvas.width / 2) / img.width, (canvas.height / 2) / img.height);
              }
              
              const scaledWidth = img.width * scale;
              const scaledHeight = img.height * scale;
              const x = (canvas.width - scaledWidth) / 2;
              const y = (canvas.height - scaledHeight) / 2;

              activeImageRef.current = {
                img,
                url: event.target?.result as string,
                x, y, width: scaledWidth, height: scaledHeight
              };
              
              redrawCanvas(strokes);
              toast.dismiss();
              toast.success("Image pasted! You can drag to move or resize it.");
            };
            img.src = event.target?.result as string;
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [selectedGroup, user, strokes]);

  const commitActiveImage = () => {
    if (!activeImageRef.current || !user) return;
    const ai = activeImageRef.current;
    
    const newStrokeData: StrokeData = {
      type: 'user-image',
      imageUrl: ai.url,
      imageData: { x: ai.x, y: ai.y, width: ai.width, height: ai.height },
      tool: 'image'
    };

    saveStrokeMutation.mutate(newStrokeData);
    activeImageRef.current = null;
    redrawCanvas(strokes); 
  };

  const commitTextInput = () => {
    if (textInputPos && textInputValue.trim()) {
      const fontSize = lineWidth * 5;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      let textWidth = 50;
      
      if (ctx) {
        ctx.font = `${fontSize}px Arial`;
        textWidth = ctx.measureText(textInputValue.trim()).width;
      }

      activeTextRef.current = {
        text: textInputValue.trim(),
        x: textInputPos.canvasX,
        y: textInputPos.canvasY,
        width: textWidth,
        height: fontSize,
        fontSize,
        color
      };
    }
    setTextInputPos(null);
    setTextInputValue('');
    redrawCanvas(strokes);
  };

  const commitActiveText = () => {
    if (!activeTextRef.current || !user) return;
    const at = activeTextRef.current;
    
    const newStrokeData: StrokeData = {
      type: 'text',
      text: at.text,
      x: at.x,
      y: at.y,
      color: at.color,
      fontSize: at.fontSize,
      tool: 'text'
    };

    saveStrokeMutation.mutate(newStrokeData);
    activeTextRef.current = null;
    
    const tempStroke: WhiteboardStroke = {
      _id: `temp-${Date.now()}`,
      group_id: selectedGroup,
      whiteboard_id: 'main',
      author_email: user.email,
      stroke_data: newStrokeData
    };
    redrawCanvas([...strokes, tempStroke]);
  };

  // ✨ FIX: Theo dõi click chuột bên ngoài Canvas Container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Nếu click bên ngoài thẻ Card bọc Canvas
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (activeImageRef.current) commitActiveImage();
        
        if (textInputPos) {
          // Người dùng đang gõ dở -> chốt chữ, và lưu thẳng xuống DB
          commitTextInput();
          setTimeout(() => commitActiveText(), 10); 
        } else if (activeTextRef.current) {
          commitActiveText();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeImageRef.current, activeTextRef.current, textInputPos, textInputValue, color, lineWidth, selectedGroup, strokes]);


  const drawStroke = (ctx: CanvasRenderingContext2D, rawData: StrokeData | string) => {
    let strokeData: StrokeData;
    try { strokeData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData; } 
    catch (e) { return; }
    if (!strokeData) return;

    ctx.globalCompositeOperation = 'source-over';

    if ((strokeData.type === 'user-image' || strokeData.type === 'ai-image' || strokeData.tool === 'image') && strokeData.imageUrl && strokeData.imageData) {
      const imgUrl = strokeData.imageUrl;

      if (imageCacheRef.current[imgUrl] && imageCacheRef.current[imgUrl].complete) {
        ctx.drawImage(imageCacheRef.current[imgUrl], strokeData.imageData.x, strokeData.imageData.y, strokeData.imageData.width, strokeData.imageData.height);
      } else if (!imageCacheRef.current[imgUrl]) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        imageCacheRef.current[imgUrl] = img; 
        img.onload = () => { setImageTrigger(prev => !prev); };
        img.src = imgUrl;
      }
      return;
    }

    if (strokeData.type === 'text' || strokeData.tool === 'text') {
      ctx.font = `${strokeData.fontSize || 20}px Arial`;
      ctx.fillStyle = strokeData.color || '#000000';
      ctx.textBaseline = 'top'; 
      ctx.fillText(strokeData.text || '', strokeData.x || 0, strokeData.y || 0);
      return;
    }

    if (strokeData.type === 'rectangle' || strokeData.tool === 'rectangle' || strokeData.tool === 'circle' || strokeData.tool === 'shape') {
      ctx.strokeStyle = strokeData.color || '#000000';
      ctx.lineWidth = strokeData.lineWidth || 2;
      ctx.beginPath();
      
      if (strokeData.tool === 'circle') {
        const radius = Math.max(Math.abs(strokeData.width || 0), Math.abs(strokeData.height || 0)) / 2;
        const centerX = (strokeData.x || 0) + (strokeData.width || 0) / 2;
        const centerY = (strokeData.y || 0) + (strokeData.height || 0) / 2;
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      } else {
        ctx.rect(strokeData.x || 0, strokeData.y || 0, strokeData.width || 0, strokeData.height || 0);
      }
      ctx.stroke();
      return;
    }

    if (!strokeData.points || !Array.isArray(strokeData.points) || strokeData.points.length < 2) return;

    ctx.strokeStyle = strokeData.color || '#000000';
    ctx.lineWidth = strokeData.lineWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (strokeData.tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';

    ctx.beginPath();
    ctx.moveTo(strokeData.points[0]?.x || 0, strokeData.points[0]?.y || 0);
    for (let i = 1; i < strokeData.points.length; i++) {
      ctx.lineTo(strokeData.points[i]?.x || 0, strokeData.points[i]?.y || 0);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };

  const redrawCanvas = (allStrokes: WhiteboardStroke[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const safeStrokes = allStrokes.map(stroke => {
      try { return typeof stroke.stroke_data === 'string' ? JSON.parse(stroke.stroke_data) : stroke.stroke_data; } 
      catch (e) { return null; }
    }).filter(Boolean);

    safeStrokes.forEach(data => {
      if (data) drawStroke(ctx, data);
    });

    if (isDrawingRef.current && currentPointsRef.current.length > 0 && (tool === 'pen' || tool === 'eraser')) {
      ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
      ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      
      ctx.beginPath();
      ctx.moveTo(currentPointsRef.current[0]?.x || 0, currentPointsRef.current[0]?.y || 0);
      for (let i = 1; i < currentPointsRef.current.length; i++) {
        ctx.lineTo(currentPointsRef.current[i]?.x || 0, currentPointsRef.current[i]?.y || 0);
      }
      ctx.stroke();
    }

    if (activeImageRef.current) {
      const ai = activeImageRef.current;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(ai.img, ai.x, ai.y, ai.width, ai.height);
      
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(ai.x, ai.y, ai.width, ai.height);
      ctx.setLineDash([]);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(ai.x + ai.width - 6, ai.y + ai.height - 6, 12, 12);
      ctx.strokeRect(ai.x + ai.width - 6, ai.y + ai.height - 6, 12, 12);
    }

    if (activeTextRef.current) {
      const at = activeTextRef.current;
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = `${at.fontSize}px Arial`;
      ctx.fillStyle = at.color;
      ctx.textBaseline = 'top';
      ctx.fillText(at.text, at.x, at.y);

      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(at.x - 4, at.y - 4, at.width + 8, at.height + 8);
      ctx.setLineDash([]);
    }

    ctx.beginPath();
  };

  useEffect(() => {
    redrawCanvas(strokes);
  }, [strokes, imageTrigger]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, clientX: 0, clientY: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      clientX: e.clientX - rect.left,
      clientY: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCoordinates(e);

    if (activeTextRef.current) {
      const at = activeTextRef.current;
      if (point.x >= at.x - 10 && point.x <= at.x + at.width + 10 &&
          point.y >= at.y - 10 && point.y <= at.y + at.height + 10) {
        interactionRef.current = 'drag_text';
        dragOffsetRef.current = { x: point.x - at.x, y: point.y - at.y };
        return;
      }
    }

    if (activeImageRef.current) {
      const ai = activeImageRef.current;
      const handleSize = 12;

      if (point.x >= ai.x + ai.width - handleSize && point.x <= ai.x + ai.width + handleSize &&
          point.y >= ai.y + ai.height - handleSize && point.y <= ai.y + ai.height + handleSize) {
        interactionRef.current = 'resize';
        return;
      }
      
      if (point.x >= ai.x && point.x <= ai.x + ai.width && point.y >= ai.y && point.y <= ai.y + ai.height) {
        interactionRef.current = 'drag';
        dragOffsetRef.current = { x: point.x - ai.x, y: point.y - ai.y };
        return;
      }
    }

    // Nếu click ra ngoài vật thể đang Active bên trong bảng
    if (activeImageRef.current) commitActiveImage();
    if (activeTextRef.current) commitActiveText();
    if (textInputPos) commitTextInput();

    if (tool === 'text') {
      e.preventDefault(); 
      setTextInputPos({
        x: point.clientX, 
        y: point.clientY, 
        canvasX: point.x, 
        canvasY: point.y  
      });
      return; 
    }

    isDrawingRef.current = true;
    startPointRef.current = point;
    currentPointsRef.current = [point];

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (ctx && canvas) {
      if (tool === 'rectangle' || tool === 'circle') {
        savedCanvasStateRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } else {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    if (interactionRef.current === 'drag_text' && activeTextRef.current) {
      activeTextRef.current.x = point.x - dragOffsetRef.current.x;
      activeTextRef.current.y = point.y - dragOffsetRef.current.y;
      redrawCanvas(strokes);
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (interactionRef.current === 'drag' && activeImageRef.current) {
      activeImageRef.current.x = point.x - dragOffsetRef.current.x;
      activeImageRef.current.y = point.y - dragOffsetRef.current.y;
      redrawCanvas(strokes);
      canvas.style.cursor = 'grabbing';
      return;
    }
    if (interactionRef.current === 'resize' && activeImageRef.current) {
      activeImageRef.current.width = Math.max(50, point.x - activeImageRef.current.x);
      activeImageRef.current.height = Math.max(50, point.y - activeImageRef.current.y);
      redrawCanvas(strokes);
      canvas.style.cursor = 'nwse-resize';
      return;
    }
    
    if (!isDrawingRef.current) {
      if (activeTextRef.current) {
        const at = activeTextRef.current;
        if (point.x >= at.x - 10 && point.x <= at.x + at.width + 10 &&
            point.y >= at.y - 10 && point.y <= at.y + at.height + 10) {
          canvas.style.cursor = 'grab';
        } else {
          canvas.style.cursor = tool === 'text' ? 'text' : 'crosshair';
        }
      } else if (activeImageRef.current) {
        const ai = activeImageRef.current;
        if (point.x >= ai.x + ai.width - 12 && point.x <= ai.x + ai.width + 12 &&
            point.y >= ai.y + ai.height - 12 && point.y <= ai.y + ai.height + 12) {
          canvas.style.cursor = 'nwse-resize';
        } else if (point.x >= ai.x && point.x <= ai.x + ai.width && point.y >= ai.y && point.y <= ai.y + ai.height) {
          canvas.style.cursor = 'grab';
        } else {
          canvas.style.cursor = tool === 'text' ? 'text' : 'crosshair';
        }
      } else {
        canvas.style.cursor = tool === 'text' ? 'text' : 'crosshair';
      }
    }

    if (!isDrawingRef.current) return;
    if (tool === 'text') return;

    if (tool === 'pen' || tool === 'eraser') {
      const prevPoint = currentPointsRef.current[currentPointsRef.current.length - 1];
      currentPointsRef.current.push(point);

      ctx.beginPath();
      ctx.moveTo(prevPoint?.x || 0, prevPoint?.y || 0);
      ctx.lineTo(point?.x || 0, point?.y || 0);

      ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
      ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      
      ctx.stroke();
      ctx.beginPath(); 

    } else if ((tool === 'rectangle' || tool === 'circle') && startPointRef.current && savedCanvasStateRef.current) {
      ctx.putImageData(savedCanvasStateRef.current, 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();

      const width = point.x - startPointRef.current.x;
      const height = point.y - startPointRef.current.y;

      if (tool === 'circle') {
        const radius = Math.max(Math.abs(width), Math.abs(height)) / 2;
        const centerX = startPointRef.current.x + width / 2;
        const centerY = startPointRef.current.y + height / 2;
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      } else {
        ctx.rect(startPointRef.current.x, startPointRef.current.y, width, height);
      }
      ctx.stroke();
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (interactionRef.current !== 'none') {
      interactionRef.current = 'none';
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = 'grab';
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (tool === 'text') return; 

    if ((tool === 'pen' || tool === 'eraser') && currentPointsRef.current.length > 1) {
      saveStrokeMutation.mutate({
        type: 'stroke',
        points: currentPointsRef.current,
        color: tool === 'eraser' ? '#FFFFFF' : color,
        lineWidth: tool === 'eraser' ? lineWidth * 3 : lineWidth,
        tool
      });
    } else if ((tool === 'rectangle' || tool === 'circle') && startPointRef.current) {
      const endPoint = getCoordinates(e);
      const width = endPoint.x - startPointRef.current.x;
      const height = endPoint.y - startPointRef.current.y;

      if (Math.abs(width) > 5 && Math.abs(height) > 5) {
        saveStrokeMutation.mutate({
          type: 'rectangle', 
          x: startPointRef.current.x,
          y: startPointRef.current.y,
          width,
          height,
          color,
          lineWidth,
          tool
        });
      } else {
        redrawCanvas(strokes);
      }
    }
    
    currentPointsRef.current = [];
    startPointRef.current = null;
    savedCanvasStateRef.current = null;
  };

  const downloadCanvas = () => {
    if (activeImageRef.current) commitActiveImage();
    if (activeTextRef.current) commitActiveText();
    if (textInputPos) {
      commitTextInput();
      setTimeout(() => commitActiveText(), 10);
    }

    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(canvas, 0, 0);
        const url = tempCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `whiteboard-${new Date().getTime()}.png`;
        link.href = url;
        link.click();
        toast.success('Whiteboard downloaded!');
      }
    }, 100);
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

  const handleUndoClick = () => {
    if (!user || undoMutation.isPending) return;
    const myStrokes = strokes.filter(s => s.author_email === user.email);
    if (myStrokes.length > 0) {
      const lastStroke = myStrokes[myStrokes.length - 1];
      const strokeId = lastStroke._id || lastStroke.id;
      if (strokeId) undoMutation.mutate(strokeId);
    } else {
      toast.error("Nothing to undo!");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Whiteboard</h1>
          <p className="text-slate-500 mt-1">Ctrl+V / Cmd+V to paste images. Click outside image to confirm.</p>
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
{/*           
          <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 shadow-sm rounded-2xl">
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

          <Card className="p-4 rounded-2xl shadow-sm border border-slate-300">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-2">
                <Button variant={tool === 'pen' ? 'default' : 'outline'} size="icon" onClick={() => setTool('pen')} className={`rounded-xl ${tool === 'pen' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600'}`}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant={tool === 'text' ? 'default' : 'outline'} size="icon" onClick={() => setTool('text')} className={`rounded-xl ${tool === 'text' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600'}`}>
                  <Type className="w-4 h-4" />
                </Button>
                <Button variant={tool === 'rectangle' ? 'default' : 'outline'} size="icon" onClick={() => setTool('rectangle')} className={`rounded-xl ${tool === 'rectangle' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600'}`}>
                  <Square className="w-4 h-4" />
                </Button>
                <Button variant={tool === 'circle' ? 'default' : 'outline'} size="icon" onClick={() => setTool('circle')} className={`rounded-xl ${tool === 'circle' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600'}`}>
                  <Circle className="w-4 h-4" />
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
                <Button 
                  variant="outline" 
                  onClick={handleUndoClick} 
                  disabled={undoMutation.isPending || !strokes.some(s => s.author_email === user?.email)}
                  className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                  title="Undo (Ctrl+Z)"
                >
                  {undoMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Undo2 className="w-4 h-4 mr-2" />}
                  Undo
                </Button>
                <Button variant="outline" onClick={downloadCanvas} className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
                <Button variant="destructive" onClick={() => clearWhiteboardMutation.mutate()} className="rounded-xl bg-red-500 hover:bg-red-600 shadow-sm">
                  <Trash2 className="w-4 h-4 mr-2" /> Clear
                </Button>
              </div>
            </div>
          </Card>

          {/* ✨ BỌC TRONG REF ĐỂ NHẬN DIỆN CLICK BÊN NGOÀI KHU VỰC VẼ */}
          <Card ref={containerRef} className="p-0 bg-white rounded-3xl shadow-lg border border-slate-300 overflow-hidden relative group">
            
            {isStrokesLoading && (
              <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            )}
            
            {textInputPos && (
              <div 
                style={{
                  position: 'absolute',
                  left: `${textInputPos.x}px`,
                  top: `${textInputPos.y}px`,
                  zIndex: 100, 
                  transform: 'translateY(-10px)'
                }}
              >
                <input
                  autoFocus
                  type="text"
                  value={textInputValue}
                  onChange={(e) => setTextInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitTextInput();
                    if (e.key === 'Escape') { setTextInputPos(null); setTextInputValue(''); }
                  }}
                  style={{
                    color: color,
                    fontSize: `${lineWidth * 5 * (canvasRef.current ? canvasRef.current.getBoundingClientRect().width / 1200 : 1)}px`,
                    background: 'rgba(255,255,255,0.95)',
                    border: `2px dashed ${color}`,
                    borderRadius: '4px',
                    outline: 'none',
                    padding: '4px 8px',
                    margin: 0,
                    fontFamily: 'Arial',
                    minWidth: '50px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  placeholder="Type + Enter"
                />
              </div>
            )}

            <canvas
              tabIndex={0}
              ref={canvasRef}
              width={1200}
              height={700}
              className="w-full touch-none outline-none"
              style={{
                backgroundImage: 'linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                cursor: tool === 'text' ? 'text' : 'crosshair'
              }}
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