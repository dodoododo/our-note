import React, { useState, useEffect, useRef } from 'react';
import { mockApiClient } from '@/lib/mockApiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Pencil, Eraser, Trash2, Download, 
  Users, Sparkles, Send
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

const colors = ['#000000', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

// --- Interfaces ---

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface Group {
  id: string;
  name: string;
  members: string[];
  owner: string;
}

interface Point {
  x: number;
  y: number;
}

interface ImageData {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StrokeData {
  points: Point[];
  color: string;
  lineWidth: number;
  tool: string;
  type?: 'ai-image' | 'stroke';
  imageUrl?: string;
  imageData?: ImageData;
}

interface WhiteboardStroke {
  id: string;
  group_id: string;
  whiteboard_id: string;
  author_email: string;
  author_name?: string;
  created_date: string;
  stroke_data: StrokeData;
}

export default function Whiteboard() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const initialGroup = urlParams.get('group');

  useEffect(() => {
    loadUser();
    if (initialGroup) {
      setSelectedGroup(initialGroup);
    }
  }, []);

  const loadUser = async () => {
    try {
      const userData = await mockApiClient.auth.me();
      setUser(userData);
    } catch (e) {
      mockApiClient.auth.redirectToLogin();
    }
  };

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups', user?.email],
    queryFn: async () => {
      const allGroups = await mockApiClient.entities.Group.list();
      return allGroups.filter((g: Group) => g.members?.includes(user?.email || '') || g.owner === user?.email);
    },
    enabled: !!user?.email,
  });

  const { data: strokes = [] } = useQuery<WhiteboardStroke[]>({
    queryKey: ['whiteboard', selectedGroup],
    queryFn: async () => {
      // Cast to any to bypass missing property on mock client type definition
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const all = await (mockApiClient.entities as any).WhiteboardStroke.filter({ 
        group_id: selectedGroup,
        whiteboard_id: 'main'
      });
      return all.sort((a: WhiteboardStroke, b: WhiteboardStroke) => 
        new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
      );
    },
    enabled: !!selectedGroup,
    refetchInterval: 2000,
  });

  const saveStrokeMutation = useMutation({
    mutationFn: async (strokeData: StrokeData) => {
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (mockApiClient.entities as any).WhiteboardStroke.create({
        group_id: selectedGroup,
        whiteboard_id: 'main',
        author_email: user.email,
        author_name: user.full_name,
        stroke_data: strokeData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteboard', selectedGroup] });
    },
  });

  const clearWhiteboardMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allStrokes = await (mockApiClient.entities as any).WhiteboardStroke.filter({ 
        group_id: selectedGroup,
        whiteboard_id: 'main'
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await Promise.all(allStrokes.map((s: any) => (mockApiClient.entities as any).WhiteboardStroke.delete(s.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteboard', selectedGroup] });
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      toast.success('Whiteboard cleared');
    },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw AI images first (background layer)
    strokes
      .filter(stroke => stroke.stroke_data.type === 'ai-image')
      .forEach(stroke => {
        drawStroke(ctx, stroke.stroke_data);
      });

    // Then draw regular strokes on top
    strokes
      .filter(stroke => stroke.stroke_data.type !== 'ai-image')
      .forEach(stroke => {
        drawStroke(ctx, stroke.stroke_data);
      });
  }, [strokes]);

  const drawStroke = (ctx: CanvasRenderingContext2D, strokeData: StrokeData) => {
    // Handle AI-generated images
    if (strokeData.type === 'ai-image' && strokeData.imageUrl && strokeData.imageData) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!strokeData.imageData) return;
        const { x, y, width, height } = strokeData.imageData;
        ctx.drawImage(img, x, y, width, height);
      };
      img.src = strokeData.imageUrl;
      return;
    }

    if (!strokeData.points || strokeData.points.length < 2) return;

    ctx.strokeStyle = strokeData.color;
    ctx.lineWidth = strokeData.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (strokeData.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.beginPath();
    ctx.moveTo(strokeData.points[0].x, strokeData.points[0].y);
    
    for (let i = 1; i < strokeData.points.length; i++) {
      ctx.lineTo(strokeData.points[i].x, strokeData.points[i].y);
    }
    
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentStroke([{ x, y }]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newStroke = [...currentStroke, { x, y }];
    setCurrentStroke(newStroke);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    const prevPoint = currentStroke[currentStroke.length - 1];
    if (prevPoint) {
      ctx.beginPath();
      ctx.moveTo(prevPoint.x, prevPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    ctx.globalCompositeOperation = 'source-over';
  };

  const stopDrawing = () => {
    if (!isDrawing || currentStroke.length < 2) {
      setIsDrawing(false);
      return;
    }

    const strokeData: StrokeData = {
      points: currentStroke,
      color: tool === 'eraser' ? '#FFFFFF' : color,
      lineWidth: tool === 'eraser' ? lineWidth * 3 : lineWidth,
      tool
    };

    saveStrokeMutation.mutate(strokeData);
    setIsDrawing(false);
    setCurrentStroke([]);
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

      // Generate image using AI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { url } = await (mockApiClient.integrations.Core as any).GenerateImage({
        prompt: `Simple, clean whiteboard-style drawing: ${aiPrompt}. White background, clear lines, easy to understand.`
      });

      // Load image onto canvas
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not found");

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Context not found");
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          // Draw image centered on canvas
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
          const x = (canvas.width - img.width * scale) / 2;
          const y = (canvas.height - img.height * scale) / 2;
          
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });

      // Calculate image dimensions for proper scaling
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (canvas.width - scaledWidth) / 2;
      const y = (canvas.height - scaledHeight) / 2;

      // Save as a special "image" stroke
      await saveStrokeMutation.mutateAsync({
        type: 'ai-image',
        imageUrl: url,
        imageData: {
          x, y, width: scaledWidth, height: scaledHeight
        },
        points: [], // Empty for image type
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
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder="Select Group" />
            </SelectTrigger>
            <SelectContent>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedGroup ? (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Select a group to start</h3>
          <p className="text-slate-500">Choose a group to collaborate on a whiteboard together</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* AI Drawing Assistant */}
          <Card className="p-4 bg-linear-to-r from-purple-50 to-indigo-50 border-2 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <Input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isGenerating && generateAIDrawing()}
                  placeholder="Describe what you want the AI to draw... (e.g., 'a beautiful sunset', 'a cat wearing a hat')"
                  className="rounded-xl border-purple-200 bg-white"
                  disabled={isGenerating}
                />
                <Button
                  onClick={generateAIDrawing}
                  disabled={!aiPrompt.trim() || isGenerating}
                  className="rounded-xl bg-linear-to-r from-purple-600 to-indigo-600"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Toolbar */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Tools */}
              <div className="flex gap-2">
                <Button
                  variant={tool === 'pen' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setTool('pen')}
                  className="rounded-xl"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant={tool === 'eraser' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setTool('eraser')}
                  className="rounded-xl"
                >
                  <Eraser className="w-4 h-4" />
                </Button>
              </div>

              <div className="h-8 w-px bg-slate-200" />

              {/* Colors */}
              <div className="flex gap-2">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      color === c ? 'scale-110 border-slate-400' : 'border-slate-200'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="h-8 w-px bg-slate-200" />

              {/* Line Width */}
              <div className="flex items-center gap-3 min-w-37.5">
                <Label className="text-sm">Size</Label>
                <Slider
                  value={[lineWidth]}
                  onValueChange={(v) => setLineWidth(v[0])}
                  min={1}
                  max={20}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm text-slate-600 w-6">{lineWidth}</span>
              </div>

              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  onClick={downloadCanvas}
                  className="rounded-xl"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => clearWhiteboardMutation.mutate()}
                  className="rounded-xl"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          </Card>

          {/* Canvas */}
          <Card className="p-4 bg-white">
            <canvas
              ref={canvasRef}
              width={1200}
              height={700}
              className="border-2 border-slate-200 rounded-2xl cursor-crosshair bg-white w-full"
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