import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Users, Heart, Search, Sparkles } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import ChatWindow from '../components/chat/ChatWindow.tsx';

// ✅ Import Real APIs and Types
import { userApi } from "@/api/user.api";
import { groupApi } from "@/api/group.api";
import { messageApi } from "@/api/message.api";
import type { Message } from "@/types/message";

export default function Messages() {
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async (): Promise<void> => {
    try {
      const userData = await userApi.getMe();
      setUser(userData);
    } catch (e) {
      navigate('/login');
    }
  };

  const { data: groups = [] } = useQuery({
    queryKey: ['groups', user?.email],
    queryFn: async () => {
      const allGroups = await groupApi.list();
      return allGroups.filter((g: any) => g.members?.includes(user?.email) || g.owner === user?.email);
    },
    enabled: !!user?.email,
  });

  const { data: allMessages = [] } = useQuery<Message[]>({
    queryKey: ['allMessages'],
    queryFn: () => messageApi.list(),
    refetchInterval: 3000,
  });

  const getGroupIcon = (type: string) => {
    switch (type) {
      case 'couple': return Heart;
      default: return Users;
    }
  };

  const getGroupColor = (type: string): string => {
    switch (type) {
      case 'couple': return 'from-pink-500 to-rose-500 shadow-pink-500/20';
      case 'family': return 'from-indigo-500 to-purple-500 shadow-indigo-500/20';
      case 'work': return 'from-emerald-400 to-teal-500 shadow-emerald-500/20';
      default: return 'from-blue-500 to-cyan-500 shadow-blue-500/20';
    }
  };

  const getLastMessage = (groupId: string): Message | null => {
    const groupMessages = allMessages.filter(m => m.group_id === groupId);
    return groupMessages.sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    )[0] || null;
  };

  const getUnreadCount = (groupId: string): number => {
    const groupMessages = allMessages.filter(m => m.group_id === groupId);
    return groupMessages.filter(m => 
      m.sender_email !== user?.email && 
      !(m.read_by || []).includes(user?.email)
    ).length;
  };

  const formatMessageTime = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'MMM d');
  };

  const filteredGroups = groups
    .filter((g: any) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a: any, b: any) => {
      const lastA = getLastMessage(a.id);
      const lastB = getLastMessage(b.id);
      if (!lastA && !lastB) return 0;
      if (!lastA) return 1;
      if (!lastB) return -1;
      return new Date(lastB.created_at || 0).getTime() - new Date(lastA.created_at || 0).getTime();
    });

  if (selectedGroup) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="h-[calc(100vh-6rem)] w-full mx-auto"
      >
        <ChatWindow
          group={selectedGroup}
          user={user}
          onBack={() => setSelectedGroup(null)}
        />
      </motion.div>
    );
  }

  return (
    <div className="mx-auto space-y-8 pb-12">
      {/* 🌟 Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            Messages
            <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
          </h1>
          <p className="text-slate-500 font-medium mt-2 text-base">
            Keep in touch with your favorite people
          </p>
        </div>
      </div>

      {/* 🔍 Smart Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-transform duration-300 group-focus-within:scale-110">
          <Search className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-14 pr-6 py-7 rounded-3xl bg-white/70 border-slate-200/60 shadow-[0_2px_10px_rgb(0,0,0,0.02)] backdrop-blur-xl focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-400 transition-all duration-300 text-slate-800 placeholder:text-slate-400 font-medium text-base"
        />
      </div>

      {/* 💬 Conversations List */}
      <AnimatePresence mode='wait'>
        {filteredGroups.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-20 px-4"
          >
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-indigo-50 to-purple-50 border border-white flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/5 rotate-3 hover:rotate-0 transition-transform duration-500">
              <MessageCircle className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">It's quiet here...</h3>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto text-base">
              You haven't joined any conversations yet. Create a group to start chatting!
            </p>
            <Link to={createPageUrl('Groups')}>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-lg shadow-slate-900/20 transition-all"
              >
                View & Join Groups
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map((group: any, index: number) => {
              const Icon = getGroupIcon(group.type);
              const lastMessage = getLastMessage(group.id);
              const unreadCount = getUnreadCount(group.id);
              const hasUnread = unreadCount > 0;

              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
                  whileHover={{ scale: 1.01, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedGroup(group)}
                  className={`group/item relative flex items-center gap-4 p-4 rounded-3xl cursor-pointer border transition-all duration-300 backdrop-blur-md ${
                    hasUnread 
                      ? 'bg-white border-indigo-100 shadow-[0_8px_30px_rgb(99,102,241,0.06)]' 
                      : 'bg-white/60 border-transparent hover:bg-white hover:border-slate-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
                  }`}
                >
                  {/* Avatar Hàng hiệu */}
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-[1.25rem] bg-gradient-to-br ${getGroupColor(group.type)} flex items-center justify-center shadow-lg flex-shrink-0 transition-transform duration-500 group-hover/item:rotate-[-5deg] group-hover/item:scale-105`}>
                      <Icon className="w-7 h-7 text-white drop-shadow-md" />
                    </div>
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white"></span>
                      </span>
                    )}
                  </div>

                  {/* Nội dung Chat */}
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className={`truncate text-[1.05rem] ${hasUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700 group-hover/item:text-slate-900'} transition-colors`}>
                        {group.name}
                      </h3>
                      {lastMessage?.created_at && (
                        <span className={`text-xs flex-shrink-0 ml-3 font-medium ${hasUnread ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {formatMessageTime(lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between gap-4">
                      <p className={`text-[0.95rem] truncate ${hasUnread ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                        {lastMessage ? (
                          <>
                            <span className={lastMessage.sender_email === user?.email ? 'text-slate-400 font-medium' : ''}>
                              {lastMessage.sender_email === user?.email ? 'You: ' : `${lastMessage.sender_name}: `}
                            </span>
                            <span className={hasUnread && lastMessage.sender_email !== user?.email ? 'text-slate-900' : ''}>
                              {lastMessage.content}
                            </span>
                          </>
                        ) : (
                          <span className="italic text-slate-400">Tap to start the conversation...</span>
                        )}
                      </p>
                      
                      {hasUnread && (
                        <Badge className="ml-auto bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-full h-6 min-w-[24px] flex items-center justify-center px-2 text-xs font-bold shadow-sm shadow-indigo-500/20 border-0 flex-shrink-0">
                          {unreadCount > 4 ? '4+' : unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}