import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { mockApiClient } from '@/lib/mockApiClient';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Users, Heart, Search } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import ChatWindow from '../components/chat/ChatWindow.tsx';

export default function Messages() {
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async (): Promise<void> => {
    try {
      const userData = await mockApiClient.auth.me();
      setUser(userData);
    } catch (e) {
      mockApiClient.auth.redirectToLogin();
    }
  };

  const { data: groups = [] } = useQuery({
    queryKey: ['groups', user?.email],
    queryFn: async () => {
      const allGroups = await mockApiClient.entities.Group.list();
      return allGroups.filter(g => g.members?.includes(user?.email) || g.owner === user?.email);
    },
    enabled: !!user?.email,
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['allMessages'],
    queryFn: () => mockApiClient.entities.Message.list('-created_date', 1000),
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
      case 'couple': return 'from-pink-500 to-rose-500';
      case 'family': return 'from-indigo-500 to-purple-500';
      case 'work': return 'from-emerald-500 to-teal-500';
      default: return 'from-blue-500 to-cyan-500';
    }
  };

  const getLastMessage = (groupId: string): any => {
    const groupMessages = allMessages.filter(m => m.group_id === groupId);
    return groupMessages[0] || null;
  };

  const getUnreadCount = (groupId: string): number => {
    const groupMessages = allMessages.filter(m => m.group_id === groupId);
    return groupMessages.filter(m => 
      m.sender_email !== user?.email && 
      !m.read_by?.includes(user?.email)
    ).length;
  };

  const formatMessageTime = (dateString: string): string => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'MMM d');
  };

  const filteredGroups = groups
    .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const lastA = getLastMessage(a.id);
      const lastB = getLastMessage(b.id);
      if (!lastA && !lastB) return 0;
      if (!lastA) return 1;
      if (!lastB) return -1;
      return new Date(lastB.created_date).getTime() - new Date(lastA.created_date).getTime();
    });

  if (selectedGroup) {
    return (
      <div className="max-w-5xl mx-auto">
        <ChatWindow
          group={selectedGroup}
          user={user}
          onBack={() => setSelectedGroup(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Messages</h1>
        <p className="text-slate-500 mt-1">Chat with your groups</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 py-6 rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm"
        />
      </div>

      {/* Conversations List */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">No conversations yet</h3>
          <p className="text-slate-500 mb-6">Join or create a group to start chatting</p>
          <Link to={createPageUrl('Groups')}>
            <button className="px-6 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium">
              View Groups
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredGroups.map((group, index) => {
            const Icon = getGroupIcon(group.type);
            const lastMessage = getLastMessage(group.id);
            const unreadCount = getUnreadCount(group.id);

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer bg-white/80 backdrop-blur-sm overflow-hidden"
                  onClick={() => setSelectedGroup(group)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Group Avatar */}
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getGroupColor(group.type)} flex items-center justify-center shadow-lg flex-shrink-0`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>

                      {/* Group Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-slate-800 truncate">{group.name}</h3>
                          {lastMessage && (
                            <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                              {formatMessageTime(lastMessage.created_date)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-500 truncate">
                            {lastMessage ? (
                              <>
                                <span className="font-medium">
                                  {lastMessage.sender_email === user?.email ? 'You' : lastMessage.sender_name}:
                                </span>
                                {' '}
                                {lastMessage.content}
                              </>
                            ) : (
                              'No messages yet'
                            )}
                          </p>
                          {unreadCount > 0 && (
                            <Badge className="ml-2 bg-indigo-600 text-white rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}