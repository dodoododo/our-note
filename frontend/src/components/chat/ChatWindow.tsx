import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Check, CheckCheck, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// ✅ Real API & Types & Socket
import { messageApi } from '@/api/message.api';
import { socket } from '@/lib/socket'; 
import type { Message, TypingStatus } from '@/types/message';

interface ChatWindowProps {
  group: any;
  user: any;
  onBack?: () => void;
}

export default function ChatWindow({ group, user, onBack }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTypers, setActiveTypers] = useState<TypingStatus[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  // 🛡️ BẢO VỆ: Lấy tên an toàn cho bản thân để gửi đi (tránh 'undefined is typing')
  const currentUserName: string = 
    user?.name || 
    user?.full_name || 
    user?.firstName || 
    (user?.email ? user.email.split('@')[0] : 'Unknown User');

  // 1. Fetch lịch sử tin nhắn
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['messages', group.id],
    queryFn: async () => {
      const msgs = await messageApi.list(group.id);
      return msgs.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    },
  });

  // ✨ HÀM HELPER SIÊU TRÍ TUỆ: Tìm tên thật của user từ email bằng mọi giá
  const getMemberName = (email: string) => {
    // Ưu tiên 1: Lấy từ Map của group (nếu backend có trả về)
    if (group?.member_names && group.member_names[email]) {
      return group.member_names[email];
    }
    
    // Ưu tiên 2: Lục tìm trong lịch sử tin nhắn xem người này từng xưng tên là gì
    const msgFromUser = messages.find(m => m.sender_email === email && m.sender_name);
    if (msgFromUser?.sender_name) {
      return msgFromUser.sender_name;
    }
    
    // Fallback: Cắt bỏ đuôi @gmail.com
    return email.split('@')[0];
  };

  // 2. Cài đặt Socket.IO Listeners
  useEffect(() => {
    if (!user || !group) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join_group', group.id);

    socket.on('receive_message', (newMessage: Message) => {
      if (!newMessage || newMessage.group_id !== group.id) return;

      queryClient.setQueryData(['messages', group.id], (oldMessages: Message[] | undefined) => {
        const currentMessages = oldMessages || [];
        const isDuplicate = currentMessages.some(m => (m._id || m.id) === (newMessage._id || newMessage.id));
        if (isDuplicate) return currentMessages;
        return [...currentMessages, newMessage];
      });

      if (newMessage.sender_email !== user.email) {
        socket.emit('mark_read', { messageId: newMessage._id || newMessage.id, groupId: group.id, userEmail: user.email });
      }
    });

    socket.on('typing_status', (status: TypingStatus) => {
      if (status.group_id === group.id && status.user_email !== user.email) {
        setActiveTypers(prev => {
          if (status.is_typing) {
            if (!prev.find(t => t.user_email === status.user_email)) {
              return [...prev, status];
            }
            return prev;
          } else {
            return prev.filter(t => t.user_email !== status.user_email);
          }
        });
      }
    });

    socket.on('message_read', ({ messageId, readBy }: { messageId: string, readBy: string[] }) => {
      queryClient.setQueryData(['messages', group.id], (oldMessages: Message[] | undefined) => {
        return (oldMessages || []).map(msg => 
          (msg._id === messageId || msg.id === messageId) 
            ? { ...msg, read_by: readBy } 
            : msg
        );
      });
    });

    socket.on('group_messages_read', ({ userEmail, groupId: readGroupId }: { userEmail: string, groupId: string }) => {
      if (readGroupId === group.id && userEmail !== user.email) {
        queryClient.setQueryData(['messages', group.id], (oldMessages: Message[] | undefined) => {
          return (oldMessages || []).map(msg => {
            if (msg.sender_email !== userEmail && !(msg.read_by || []).includes(userEmail)) {
              return { ...msg, read_by: [...(msg.read_by || []), userEmail] };
            }
            return msg;
          });
        });
      }
    });

    return () => {
      socket.emit('leave_group', group.id);
      socket.off('receive_message');
      socket.off('typing_status');
      socket.off('message_read');
      socket.off('group_messages_read');
    };
  }, [group.id, user, queryClient]);

  // 3. Mutation gửi tin nhắn
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const payload = {
        group_id: group.id,
        sender_email: user.email,
        sender_name: currentUserName,
        content,
        message_type: 'text' as const
      };
      
      socket.emit('typing', { group_id: group.id, user_email: user.email, user_name: currentUserName, is_typing: false });
      setIsTyping(false);

      return await messageApi.create(payload);
    },
    onSuccess: (newMsg) => {
      if (!newMsg) return;

      queryClient.setQueryData(['messages', group.id], (oldMessages: Message[] | undefined) => {
        const currentMessages = oldMessages || [];
        const isDuplicate = currentMessages.some(m => (m._id || m.id) === (newMsg._id || newMsg.id));
        if (isDuplicate) return currentMessages;
        return [...currentMessages, newMsg];
      });
      setMessage('');
    },
  });

  const handleTyping = (value: string): void => {
    setMessage(value);
    
    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      socket.emit('typing', { group_id: group.id, user_email: user.email, user_name: currentUserName, is_typing: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', { group_id: group.id, user_email: user.email, user_name: currentUserName, is_typing: false });
    }, 2000);
  };

  const handleSend = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  // Tự động mark as read khi mở chat
  useEffect(() => {
    const unreadMessages = messages.filter(
      m => m && m.sender_email !== user.email && !(m.read_by || []).includes(user.email)
    );
    
    if (unreadMessages.length > 0) {
      messageApi.markAsRead(group.id, user.email).then(() => {
        queryClient.invalidateQueries({ queryKey: ['messages', group.id] });
      }).catch(console.error);
    }
  }, [messages.length, user.email, group.id, queryClient]);

  // Tự động cuộn xuống cuối
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTypers]);

  const getInitials = (name?: string): string => {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden border border-slate-100">
      {/* Header */}
      {onBack && (
        <div className="border-b border-slate-200 p-4 bg-white/90 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 leading-tight">{group?.name}</h2>
              <p className="text-xs text-slate-500 font-medium">{group?.members?.length || 0} members</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Khu vực Tin nhắn */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
        <AnimatePresence initial={false}>
          {messages
            .filter(msg => msg && (msg._id || msg.id))
            .map((msg: Message) => {
              const isOwn = msg.sender_email === user.email;
              
              // Lấy tên hiển thị chuẩn xác nhất cho người gửi
              const senderDisplayName = getMemberName(msg.sender_email);

              const otherMembers = group.members?.filter((m: string) => m !== msg.sender_email) || [];
              const readByOthers = msg.read_by?.filter((email: string) => email !== msg.sender_email) || [];
              const isReadByAll = readByOthers.length === otherMembers.length && otherMembers.length > 0;

              // ✨ TẠO TOOLTIP TEXT CHUẨN XÁC VỚI TÊN THẬT
              const readByNames = readByOthers.map(email => getMemberName(email)).join(', ');
              
              const tooltipText = isReadByAll 
                ? `Read by everyone (${readByNames})` 
                : readByOthers.length > 0 
                  ? `Read by: ${readByNames}` 
                  : 'Delivered';

              return (
                <motion.div
                  key={msg._id || msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* AVATAR CỦA NGƯỜI GỬI TIN NHẮN */}
                  {!isOwn && (
                    <Avatar className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 shadow-sm mt-auto mb-1">
                      <AvatarFallback className="bg-transparent text-white text-xs font-bold">
                        {getInitials(senderDisplayName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {/* TÊN NGƯỜI GỬI TRÊN ĐẦU TIN NHẮN */}
                    {!isOwn && (
                      <span className="text-[11px] font-semibold text-slate-400 mb-1 ml-1">
                        {senderDisplayName}
                      </span>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                        isOwn
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-sm'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[10px] font-medium text-slate-400">
                        {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : 'Sending...'}
                      </span>
                      
                      {/* TRẠNG THÁI ĐÃ ĐỌC */}
                      {isOwn && msg.created_at && (
                        <div className="flex items-center ml-0.5 cursor-help" title={tooltipText}>
                          {isReadByAll ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                          ) : readByOthers.length > 0 ? (
                            
                            // ✨ KHU VỰC HIỂN THỊ AVATAR NGƯỜI ĐỌC ✨
                            <div className="flex -space-x-1.5 items-center">
                              {readByOthers.slice(0, 3).map((email, idx) => {
                                // Lấy tên thật để tạo Avatar 2 chữ cái đầu
                                const realName = getMemberName(email);
                                
                                return (
                                  <Avatar 
                                    key={email} 
                                    className="w-4 h-4 border-[1.5px] border-white shadow-sm"
                                    style={{ zIndex: 10 - idx }}
                                  >
                                    <AvatarFallback className="text-[7px] font-bold bg-slate-200 text-slate-600">
                                      {getInitials(realName)}
                                    </AvatarFallback>
                                  </Avatar>
                                );
                              })}
                              
                              {/* Hiển thị badge +N nếu có nhiều hơn 3 người đọc */}
                              {readByOthers.length > 3 && (
                                <div 
                                  className="w-4 h-4 rounded-full border-[1.5px] border-white bg-slate-100 flex items-center justify-center shadow-sm"
                                  style={{ zIndex: 0 }}
                                >
                                  <span className="text-[7px] font-bold text-slate-500">+{readByOthers.length - 3}</span>
                                </div>
                              )}
                            </div>

                          ) : (
                            <Check className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
          })}
        </AnimatePresence>

        {/* Cảnh báo Gõ phím theo thời gian thực (Typing Indicator) */}
        <AnimatePresence>
          {activeTypers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex gap-3"
            >
              <Avatar className="w-8 h-8 bg-slate-200">
                <AvatarFallback className="bg-transparent text-slate-500 text-xs">
                  {getInitials(activeTypers[0].user_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-4 py-2 flex items-center gap-2 rounded-bl-sm">
                <span className="text-xs font-medium text-slate-500">
                  {activeTypers.length === 1 
                    ? `${activeTypers[0].user_name || activeTypers[0].user_email?.split('@')[0]} is typing`
                    : `${activeTypers.length} people are typing`}
                </span>
                <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Khu vực Nhập tin nhắn */}
      <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex gap-3 items-center max-w-4xl mx-auto">
          <Input
            value={message}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTyping(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type your message..."
            className="rounded-full flex-1 py-6 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="icon"
            className="rounded-full w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md hover:shadow-lg transition-all shrink-0"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-white ml-1" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}