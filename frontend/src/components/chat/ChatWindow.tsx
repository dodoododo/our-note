import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Check, CheckCheck, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

  // 1. Fetch initial message history
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['messages', group.id],
    queryFn: async () => {
      const msgs = await messageApi.list(group.id);
      return msgs.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    },
  });

  // 2. Setup Socket.IO Listeners with Safety Fixes
  useEffect(() => {
    if (!user || !group) return;

    socket.connect();
    socket.emit('join_group', group.id);

    // FIX: Added safety check for newMessage and duplicate prevention
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

    return () => {
      socket.emit('leave_group', group.id);
      socket.off('receive_message');
      socket.off('typing_status');
      socket.off('message_read');
    };
  }, [group.id, user, queryClient]);

  // 3. Send Message Mutation with Safety Fixes
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const payload = {
        group_id: group.id,
        sender_email: user.email,
        sender_name: user.full_name,
        content,
        message_type: 'text' as const
      };
      
      socket.emit('typing', { group_id: group.id, user_email: user.email, user_name: user.full_name, is_typing: false });
      setIsTyping(false);

      return await messageApi.create(payload);
    },
    onSuccess: (newMsg) => {
      // FIX: Ensure newMsg is valid before updating cache to prevent 'undefined' crash
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
      socket.emit('typing', { group_id: group.id, user_email: user.email, user_name: user.full_name, is_typing: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', { group_id: group.id, user_email: user.email, user_name: user.full_name, is_typing: false });
    }, 2000);
  };

  const handleSend = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  useEffect(() => {
    const unreadMessages = messages.filter(
      m => m && m.sender_email !== user.email && !(m.read_by || []).includes(user.email)
    );
    
    if (unreadMessages.length > 0) {
      messageApi.markAsRead(group.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ['messages', group.id] });
      }).catch(console.error);
    }
  }, [messages.length, user.email, group.id, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTypers]);

  const getInitials = (name?: string): string => {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isMessageReadByAll = (msg: Message): boolean => {
    const otherMembers = group.members?.filter((m: string) => m !== msg.sender_email) || [];
    const readByOthers = msg.read_by?.filter((email: string) => email !== msg.sender_email) || [];
    return readByOthers.length === otherMembers.length && otherMembers.length > 0;
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
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
        <AnimatePresence initial={false}>
          {messages
            .filter(msg => msg !== undefined && msg !== null) // 🛡️ FIX: Safety filter
            .map((msg: Message) => {
              const isOwn = msg.sender_email === user.email;
              const isRead = isMessageReadByAll(msg);
              const readCount = (msg.read_by?.filter((e: string) => e !== msg.sender_email) || []).length;

              return (
                <motion.div
                  key={msg._id || msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isOwn && (
                    <Avatar className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 shadow-sm mt-auto mb-1">
                      <AvatarFallback className="bg-transparent text-white text-xs font-bold">
                        {getInitials(msg.sender_name || msg.sender_email)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && (
                      <span className="text-[11px] font-semibold text-slate-400 mb-1 ml-1">{msg.sender_name}</span>
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
                      {isOwn && msg.created_at && (
                        <span className="text-xs">
                          {isRead ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                          ) : readCount > 0 ? (
                            <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
          })}
        </AnimatePresence>

        {/* Real-time Typing Indicator */}
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
                    ? `${activeTypers[0].user_name} is typing`
                    : `${activeTypers.length} people are typing`}
                </span>
                <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input Area */}
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