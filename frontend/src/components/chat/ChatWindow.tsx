import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Check, CheckCheck, Loader2, ArrowLeft, Trash2, Users, Info, X, Mail } from 'lucide-react';
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
  
  // States cho UI mới
  const [viewingUser, setViewingUser] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const currentUserName: string = 
    user?.name || 
    user?.full_name || 
    user?.firstName || 
    (user?.email ? user.email.split('@')[0] : 'Unknown User');

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['messages', group.id],
    queryFn: async () => {
      const msgs = await messageApi.list(group.id);
      return msgs.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    },
  });

  const getMemberName = (email: string) => {
    if (group?.member_names && group.member_names[email]) return group.member_names[email];
    const msgFromUser = messages.find(m => m.sender_email === email && m.sender_name);
    if (msgFromUser?.sender_name) return msgFromUser.sender_name;
    return email.split('@')[0];
  };

  // Logic Socket giữ nguyên
  useEffect(() => {
    if (!user || !group) return;
    if (!socket.connected) socket.connect();

    socket.emit('join_group', group.id);

    socket.on('receive_message', (newMessage: Message) => {
      if (!newMessage || newMessage.group_id !== group.id) return;
      queryClient.setQueryData(['messages', group.id], (oldMessages: Message[] | undefined) => {
        const currentMessages = oldMessages || [];
        if (currentMessages.some(m => (m._id || m.id) === (newMessage._id || newMessage.id))) return currentMessages;
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
            if (!prev.find(t => t.user_email === status.user_email)) return [...prev, status];
            return prev;
          } else {
            return prev.filter(t => t.user_email !== status.user_email);
          }
        });
      }
    });

    socket.on('message_read', ({ messageId, readBy }: { messageId: string, readBy: string[] }) => {
      queryClient.setQueryData(['messages', group.id], (oldMessages: Message[] | undefined) => {
        return (oldMessages || []).map(msg => (msg._id === messageId || msg.id === messageId) ? { ...msg, read_by: readBy } : msg);
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

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const payload = { group_id: group.id, sender_email: user.email, sender_name: currentUserName, content, message_type: 'text' as const };
      socket.emit('typing', { group_id: group.id, user_email: user.email, user_name: currentUserName, is_typing: false });
      setIsTyping(false);
      return await messageApi.create(payload);
    },
    onSuccess: (newMsg) => {
      if (!newMsg) return;
      queryClient.setQueryData(['messages', group.id], (oldMessages: Message[] | undefined) => {
        const currentMessages = oldMessages || [];
        if (currentMessages.some(m => (m._id || m.id) === (newMsg._id || newMsg.id))) return currentMessages;
        return [...currentMessages, newMsg];
      });
      setMessage('');
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await messageApi.delete(messageId);
      return messageId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(['messages', group.id], (oldMessages: Message[] | undefined) => {
        return (oldMessages || []).filter(msg => msg.id !== deletedId && msg._id !== deletedId);
      });
    }
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
    if (message.trim()) sendMessageMutation.mutate(message.trim());
  };

  useEffect(() => {
    const unreadMessages = messages.filter(m => m && m.sender_email !== user.email && !(m.read_by || []).includes(user.email));
    if (unreadMessages.length > 0) {
      messageApi.markAsRead(group.id, user.email).then(() => {
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

  const Overlay = ({ onClick }: { onClick: () => void }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClick} className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-40 rounded-[2.5rem]" />
  );

  return (
    <div className="relative min-w-fit h-[calc(100vh-5rem)] flex flex-col bg-gradient-to-b from-slate-50 to-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/50 ring-1 ring-slate-900/5">
      
      {/* 🌟 Header */}
      <div className="relative z-10 border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 text-slate-500 hover:text-indigo-600">
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <motion.div 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowMembers(true)}
            className="cursor-pointer group flex flex-col"
          >
            <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 group-hover:from-indigo-600 group-hover:to-purple-600 transition-all">
              {group?.name}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
              <Users className="w-3.5 h-3.5" />
              <span>{group?.members?.length || 0} members</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 ml-1 hidden md:inline">• Tap to view info</span>
            </div>
          </motion.div>
        </div>
        <button onClick={() => setShowMembers(true)} className="p-2.5 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-colors">
          <Info className="w-6 h-6" />
        </button>
      </div>
      
      {/* 💬 Khu vực Tin nhắn (Tự động lấp đầy phần giữa) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-5 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-95">
        <div className="max-w-5xl mx-auto space-y-5">
          <AnimatePresence initial={false}>
            {messages.filter(msg => msg && (msg._id || msg.id)).map((msg: Message) => {
              const isOwn = msg.sender_email === user.email;
              const msgId = msg._id || msg.id as string;
              const senderDisplayName = getMemberName(msg.sender_email);
              const otherMembers = group.members?.filter((m: string) => m !== msg.sender_email) || [];
              const readByOthers = msg.read_by?.filter((email: string) => email !== msg.sender_email) || [];
              const isReadByAll = readByOthers.length === otherMembers.length && otherMembers.length > 0;
              const readByNames = readByOthers.map(email => getMemberName(email)).join(', ');
              const tooltipText = isReadByAll ? `Read by everyone (${readByNames})` : readByOthers.length > 0 ? `Read by: ${readByNames}` : 'Delivered';

              return (
                <motion.div
                  key={msgId}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`group flex gap-3 md:gap-4 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isOwn && (
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Avatar 
                        onClick={() => setViewingUser(msg.sender_email)}
                        className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-md mt-auto mb-1 cursor-pointer ring-2 ring-transparent hover:ring-indigo-300 transition-all"
                      >
                        <AvatarFallback className="bg-transparent text-white text-[11px] md:text-sm font-bold">
                          {getInitials(senderDisplayName)}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                  )}
                  
                  <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && (
                      <span className="text-[11px] md:text-xs font-bold text-slate-400 mb-1 ml-1.5 uppercase tracking-wide">
                        {senderDisplayName}
                      </span>
                    )}
                    
                    <div className="relative group/bubble flex items-center gap-2">
                      {isOwn && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileHover={{ scale: 1.1 }}
                          className="opacity-0 group-hover/bubble:opacity-100 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
                          onClick={() => deleteMessageMutation.mutate(msgId)}
                          disabled={deleteMessageMutation.isPending}
                        >
                          {deleteMessageMutation.isPending && deleteMessageMutation.variables === msgId ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4 md:w-5 md:h-5" />}
                        </motion.button>
                      )}

                      <div
                        className={`relative rounded-3xl px-5 py-3 md:px-6 md:py-4 shadow-sm ${
                          isOwn
                            ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 text-white rounded-br-sm shadow-indigo-500/20'
                            : 'bg-white border border-slate-100/50 text-slate-800 rounded-bl-sm shadow-slate-200/50 backdrop-blur-sm'
                        }`}
                      >
                        <p className="text-[15px] md:text-base leading-relaxed break-words whitespace-pre-wrap font-medium">{msg.content}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1.5 px-1.5">
                      <span className="text-[10px] md:text-xs font-semibold text-slate-400/80">
                        {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : 'Sending...'}
                      </span>
                      
                      {isOwn && msg.created_at && (
                        <div className="flex items-center ml-1 cursor-help" title={tooltipText}>
                          {isReadByAll ? (
                            <CheckCheck className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                          ) : readByOthers.length > 0 ? (
                            <div className="flex -space-x-1.5 items-center">
                              {readByOthers.slice(0, 3).map((email, idx) => (
                                <Avatar key={email} className="w-4 h-4 md:w-5 md:h-5 border-[1.5px] border-white shadow-sm" style={{ zIndex: 10 - idx }}>
                                  <AvatarFallback className="text-[7px] md:text-[8px] font-bold bg-slate-200 text-slate-600">
                                    {getInitials(getMemberName(email))}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {readByOthers.length > 3 && (
                                <div className="w-4 h-4 md:w-5 md:h-5 rounded-full border-[1.5px] border-white bg-slate-100 flex items-center justify-center shadow-sm" style={{ zIndex: 0 }}>
                                  <span className="text-[6px] md:text-[8px] font-bold text-slate-500">+{readByOthers.length - 3}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <Check className="w-4 h-4 md:w-5 md:h-5 text-slate-300" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing Indicator */}
          <AnimatePresence>
            {activeTypers.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex gap-3 md:gap-4 mt-4">
                <Avatar className="w-10 h-10 md:w-12 md:h-12 bg-slate-200">
                  <AvatarFallback className="bg-transparent text-slate-500 text-xs md:text-sm font-bold">
                    {getInitials(activeTypers[0].user_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm rounded-3xl px-5 py-3 md:px-6 md:py-4 flex items-center gap-2 rounded-bl-sm">
                  <span className="text-xs md:text-sm font-semibold text-slate-500">
                    {activeTypers.length === 1 ? `${activeTypers[0].user_name} is typing` : `${activeTypers.length} people are typing`}
                  </span>
                  <div className="flex gap-1 ml-1">
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 md:w-2 md:h-2 bg-slate-400 rounded-full" />
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 md:w-2 md:h-2 bg-slate-400 rounded-full" />
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 md:w-2 md:h-2 bg-slate-400 rounded-full" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-2" />
        </div>
      </div>

      {/* 📝 Khu vực Nhập tin nhắn (Cố định ở đáy) */}
      <div className="bg-white/80 backdrop-blur-2xl border-t border-slate-200/60 p-4 md:p-6 shrink-0 z-20">
        <div className="flex gap-3 items-center max-w-5xl mx-auto">
          <Input
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="rounded-full flex-1 py-7 px-6 bg-slate-100/50 border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:bg-white text-[15px] md:text-base font-medium placeholder:text-slate-400 transition-all"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="icon"
            className="rounded-full w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/25 transition-transform active:scale-95 shrink-0"
          >
            {sendMessageMutation.isPending ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Send className="w-6 h-6 text-white -ml-0.5 mt-0.5" />}
          </Button>
        </div>
      </div>

      {/* Modal Hồ sơ người dùng */}
      <AnimatePresence>
        {viewingUser && (
          <>
            <Overlay onClick={() => setViewingUser(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] bg-white rounded-[2.5rem] shadow-2xl z-50 overflow-hidden border border-slate-100"
            >
              <div className="h-28 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 w-full relative">
                <button onClick={() => setViewingUser(null)} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 pb-8 text-center relative mt-[-48px]">
                <Avatar className="w-24 h-24 mx-auto border-[6px] border-white shadow-xl bg-indigo-100">
                  <AvatarFallback className="text-3xl font-bold text-indigo-600">{getInitials(getMemberName(viewingUser))}</AvatarFallback>
                </Avatar>
                <h3 className="mt-4 text-2xl font-bold text-slate-800">{getMemberName(viewingUser)}</h3>
                <div className="mt-2 flex items-center justify-center gap-2 text-slate-500 text-sm font-medium bg-slate-50 py-2 px-4 rounded-full w-fit mx-auto border border-slate-100">
                  <Mail className="w-4 h-4" />
                  {viewingUser}
                </div>
                <Button className="w-full mt-6 py-6 rounded-2xl bg-slate-900 text-white font-semibold text-base hover:bg-slate-800 shadow-xl shadow-slate-900/20" onClick={() => setViewingUser(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Slide-over Modal Danh sách thành viên */}
      <AnimatePresence>
        {showMembers && (
          <>
            <Overlay onClick={() => setShowMembers(false)} />
            <motion.div 
              initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute top-0 right-0 bottom-0 w-80 md:w-96 bg-white/95 backdrop-blur-2xl shadow-2xl z-50 flex flex-col border-l border-slate-100/50 rounded-r-[2.5rem]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-tr-[2.5rem]">
                <h3 className="font-bold text-xl text-slate-800">Group Members</h3>
                <button onClick={() => setShowMembers(false)} className="p-2.5 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {group.members.map((email: string) => (
                  <div key={email} className="flex items-center gap-4 p-3 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer group" onClick={() => {setShowMembers(false); setViewingUser(email);}}>
                    <Avatar className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 shadow-sm group-hover:shadow-md transition-shadow">
                      <AvatarFallback className="text-black font-bold text-sm border-b-blue-900 border-2">{getInitials(getMemberName(email))}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base text-slate-800 truncate">{getMemberName(email)}</p>
                      <p className="text-sm text-slate-500 truncate">{email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
    </div>
  );
}