import { useState, useEffect, useRef } from 'react';
import { mockApiClient } from '@/lib/mockApiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Check, CheckCheck, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatWindowProps {
  group: any;
  user: any;
  onBack?: () => void;
}

export default function ChatWindow({ group, user, onBack }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', group.id],
    queryFn: async () => {
      const msgs = await mockApiClient.entities.Message.list().then(m => m.filter(msg => msg.group_id === group.id));
      return msgs.sort((a: any, b: any) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime());
    },
    refetchInterval: 2000, // Real-time updates every 2 seconds
  });

  const { data: typingStatuses = [] } = useQuery({
    queryKey: ['typingStatuses', group.id],
    queryFn: async () => {
      const statuses = await mockApiClient.entities.TypingStatus.list().then(s => s.filter(st => st.group_id === group.id && st.is_typing === true));
      // Filter out old typing statuses (more than 5 seconds old)
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      return statuses.filter(s => new Date(s.updated_date) > fiveSecondsAgo && s.user_email !== user.email);
    },
    refetchInterval: 1000, // Check typing status every second
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      // Create message
      const msg = await mockApiClient.entities.Message.create({
        group_id: group.id,
        sender_email: user.email,
        sender_name: user.full_name,
        content,
        read_by: [user.email]
      });
      
      // Clear typing status
      const allStatuses = await mockApiClient.entities.TypingStatus.list();
      const myTypingStatus = allStatuses.filter(s => s.group_id === group.id && s.user_email === user.email);
      if (myTypingStatus.length > 0) {
        await mockApiClient.entities.TypingStatus.delete(myTypingStatus[0].id);
      }
      
      return msg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', group.id] });
      setMessage('');
      setIsTyping(false);
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const msg = messages.find((m: any) => m.id === messageId);
      if (msg && !msg.read_by?.includes(user.email)) {
        await mockApiClient.entities.Message.update(messageId, {
          read_by: [...(msg.read_by || []), user.email]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', group.id] });
    },
  });

  const updateTypingStatus = async (typing: boolean): Promise<void> => {
    try {
      const allStatuses = await mockApiClient.entities.TypingStatus.list();
      const existing = allStatuses.filter(s => s.group_id === group.id && s.user_email === user.email);

      if (typing) {
        if (existing.length > 0) {
          await mockApiClient.entities.TypingStatus.update(existing[0].id, {
            is_typing: true,
            user_name: user.full_name
          });
        } else {
          await mockApiClient.entities.TypingStatus.create({
            group_id: group.id,
            user_email: user.email,
            user_name: user.full_name,
            is_typing: true
          });
        }
      } else if (existing.length > 0) {
        await mockApiClient.entities.TypingStatus.delete(existing[0].id);
      }
    } catch (e) {
      // Ignore errors
    }
  };

  const handleTyping = (value: string): void => {
    setMessage(value);
    
    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      updateTypingStatus(true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to clear typing status
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 3000);
  };

  const handleSend = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  // Mark unread messages as read
  useEffect(() => {
    const unreadMessages = messages.filter(
      m => m.sender_email !== user.email && !m.read_by?.includes(user.email)
    );
    unreadMessages.forEach(msg => {
      markAsReadMutation.mutate(msg.id);
    });
  }, [messages, user.email]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup typing status on unmount
  useEffect(() => {
    return () => {
      updateTypingStatus(false);
    };
  }, []);

  const getInitials = (name: string): string => {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isMessageRead = (msg: any): boolean => {
    const otherMembers = group.members?.filter((m: string) => m !== msg.sender_email) || [];
    const readByOthers = msg.read_by?.filter((email: string) => email !== msg.sender_email) || [];
    return readByOthers.length === otherMembers.length && otherMembers.length > 0;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden">
      {/* Header */}
      {onBack && (
        <div className="border-b border-slate-200 p-4 bg-white/50">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{group?.name}</h2>
              <p className="text-sm text-slate-500">{group?.members?.length || 0} members</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg: any) => {
            const isOwn = msg.sender_email === user.email;
            const isRead = isMessageRead(msg);
            const readCount = (msg.read_by?.filter((e: string) => e !== msg.sender_email) || []).length;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!isOwn && (
                  <Avatar className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500">
                    <AvatarFallback className="bg-transparent text-white text-xs">
                      {getInitials(msg.sender_name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && (
                    <span className="text-xs text-slate-500 mb-1 px-2">{msg.sender_name}</span>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwn
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-800'
                    }`}
                  >
                    <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-2">
                    <span className="text-xs text-slate-400">
                      {format(new Date(msg.created_date), 'HH:mm')}
                    </span>
                    {isOwn && (
                      <span className="text-xs">
                        {isRead ? (
                          <CheckCheck className="w-3 h-3 text-blue-500" />
                        ) : readCount > 0 ? (
                          <CheckCheck className="w-3 h-3 text-slate-400" />
                        ) : (
                          <Check className="w-3 h-3 text-slate-400" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {typingStatuses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-3"
            >
              <Avatar className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500">
                <AvatarFallback className="bg-transparent text-white text-xs">
                  {getInitials(typingStatuses[0].user_name)}
                </AvatarFallback>
              </Avatar>
              <div className="bg-slate-100 rounded-2xl px-4 py-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {typingStatuses.length === 1 
                    ? `${typingStatuses[0].user_name} is typing`
                    : `${typingStatuses.length} people are typing`}
                </span>
                <Loader2 className="w-3 h-3 text-slate-500 animate-spin" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4 bg-white">
        <div className="flex gap-3">
          <Input
            value={message}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTyping(e.target.value)}
            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="rounded-full flex-1"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="icon"
            className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}