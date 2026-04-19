import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, Calendar, CheckSquare, FileText, MapPin, Heart, 
  ArrowRight, Plus, Clock, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from 'framer-motion';
import { format, isToday, isTomorrow } from 'date-fns';

// Ép TypeScript nhắm mắt làm ngơ lỗi thiếu type của file JS này
// @ts-ignore
import SplashCursor from '@/components/SplashCursor';

// ✅ Import Real APIs
import { userApi } from "@/api/user.api";
import { groupApi } from "@/api/group.api";
import { eventApi } from "@/api/event.api";
import { taskApi } from "@/api/task.api";
import { noteApi } from "@/api/note.api";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  // ✨ Thêm state để kiểm tra xem chuột có đang ở trong banner hay không
  const [isBannerHovered, setIsBannerHovered] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async (): Promise<void> => {
    try {
      const userData = await userApi.getMe();
      setUser(userData);
    } catch (e) {
      navigate('/auth'); 
    }
  };
  
  const randomGreeting = useMemo(() => {
    const greetings = [
      "Top of the morning",
      "Welcome back",
      "It's great to see you",
      "Let's get this bread",
      "How are you today",
      "Ready to crush it",
      "Let's get things done",
      "Happy to have you here"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }, []);

  // 1. Fetch Real Groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['groups', user?.email],
    queryFn: async () => {
      const allGroups = await groupApi.list();
      return allGroups.filter((g: any) => g.members?.includes(user?.email) || g.owner === user?.email);
    },
    enabled: !!user?.email,
  });

  // 2. Fetch Real Upcoming Events
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['upcomingEvents', groups.map(g => g.id)],
    queryFn: async () => {
      const allEvents: any[] = await eventApi.list(); 
      const groupIds = groups.map(g => g.id);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return allEvents
        .filter((e: any) => groupIds.includes(e.group_id) && new Date(e.date) >= today)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);
    },
    enabled: groups.length > 0,
  });

  // 3. Fetch Real Tasks
  const { data: recentTasks = [] } = useQuery({
    queryKey: ['recentTasks', groups.map(g => g.id)],
    queryFn: async () => {
      const allTasks: any[] = await taskApi.list(); 
      const groupIds = groups.map(g => g.id);

      return allTasks
        .filter((t: any) => groupIds.includes(t.group_id) && !t.completed)
        .sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || a.createdAt || a.created_date || 0).getTime();
          const dateB = new Date(b.created_at || b.createdAt || b.created_date || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 5);
    },
    enabled: groups.length > 0,
  });

  // 4. Fetch Real Notes
  const { data: recentNotes = [] } = useQuery({
    queryKey: ['recentNotes', groups.map(g => g.id)],
    queryFn: async () => {
      const allNotes: any[] = await noteApi.list(); 
      const groupIds = groups.map(g => g.id);

      return allNotes
        .filter((n: any) => groupIds.includes(n.group_id))
        .sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || a.createdAt || a.created_date || 0).getTime();
          const dateB = new Date(b.created_at || b.createdAt || b.created_date || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 5);
    },
    enabled: groups.length > 0,
  });

  const getGroupIcon = (type: string) => {
    switch (type) {
      case 'couple': return Heart;
      case 'family': return Users;
      case 'work': return TrendingUp;
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

  const formatEventDate = (date: string): string => {
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM d');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }
  const displayName = user.name || user.full_name || user.firstName || (user.email ? user.email.split('@')[0] : 'there');

  return (
    <motion.div 
      className="max-w-7xl mx-auto space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ✨ PREMIUM HIGH-CONTRAST WELCOME BANNER ✨ */}
      <motion.div 
        variants={itemVariants} 
        // ✨ Ghi nhận sự kiện chuột vào/ra để điều khiển SplashCursor
        onMouseEnter={() => setIsBannerHovered(true)}
        onMouseLeave={() => setIsBannerHovered(false)}
        className="relative overflow-hidden rounded-3xl bg-white border border-rose-300 p-8 lg:p-12 shadow-2xl shadow-rose-500/10 cursor-default ring-4 ring-rose-500/5"
      >
        {/* ✨ FIX: Bọc SplashCursor bằng div kiểm soát Opacity (Chỉ hiện khi chuột ở trong Banner) */}
        <div className={`absolute inset-0 z-0 transition-opacity duration-700 ease-in-out ${isBannerHovered ? 'opacity-100' : 'opacity-0'}`}>
          <SplashCursor
            DENSITY_DISSIPATION={3.5}
            VELOCITY_DISSIPATION={2}
            PRESSURE={0.1}
            CURL={3}
            SPLAT_RADIUS={0.2}
            SPLAT_FORCE={6000}
            COLOR_UPDATE_SPEED={10}
            SHADING
            RAINBOW_MODE={false}
            COLOR="#C21124" // Tone đỏ chủ đạo
          />
        </div>

        {/* Lớp phủ texture giấy Washi Nhật Bản tinh tế */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/washi.png)' }} />

        {/* ✨ Mặt trời và Tia nắng (Layout đã chốt cứng) */}
        <div className="absolute right-[20%] bottom-0 translate-y-[45%] flex items-center justify-center z-10 pointer-events-none">
          
          <div className="absolute w-64 h-64 md:w-80 md:h-80 bg-[#d53242] rounded-full shadow-[0_0_80px_rgba(194,17,36,0.3)]" />

          <motion.div 
            className="absolute w-0 h-0 flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute flex items-center justify-center"
                style={{ transform: `rotate(${i * 30}deg)` }}
              >
                <div className="w-0 h-0 border-l-[24px] border-r-[24px] border-b-[32px] border-transparent border-b-[#FF8A8A]/70 -translate-y-[170px] md:-translate-y-[210px]" />
              </div>
            ))}
          </motion.div>
        </div>

        {/* ✨ Content Container */}
        <div className="relative z-20 w-full md:w-2/3 pointer-events-none">
          <motion.div 
            className="flex items-center gap-2 mb-4 bg-white px-4 py-1.5 rounded-full border border-red-200 shadow-sm w-fit pointer-events-auto"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-[#C21124] text-sm font-bold tracking-widest uppercase">Welcome back</span>
          </motion.div>
          
          <h1 className="text-4xl lg:text-5xl font-black mb-4 text-[#1a1a1a] tracking-tight leading-tight">
            {randomGreeting}, <br className="hidden md:block"/> {displayName}! 
          </h1>
          
          <p className="text-[#4a4a4a] text-lg font-medium max-w-xl leading-relaxed">
            You have <span className="bg-[#C21124] text-white px-2.5 py-0.5 rounded-md mx-1 font-semibold shadow-sm">{upcomingEvents.length} upcoming events</span> 
            and <span className="bg-[#212121] text-white px-2.5 py-0.5 rounded-md mx-1 font-semibold shadow-sm">{recentTasks.length} tasks</span> to complete.
          </p>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Groups', value: groups.length, icon: Users, color: 'bg-indigo-500', page: 'Groups' },
          { label: 'Events', value: upcomingEvents.length, icon: Calendar, color: 'bg-pink-500', page: 'Events' },
          { label: 'Tasks', value: recentTasks.length, icon: CheckSquare, color: 'bg-emerald-500', page: 'Tasks' },
          { label: 'Notes', value: recentNotes.length, icon: FileText, color: 'bg-amber-500', page: 'Notes' },
        ].map((stat) => (
          <Link key={stat.label} to={createPageUrl(stat.page)}>
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-white/80 backdrop-blur-sm cursor-pointer">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-slate-500 text-sm">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Your Groups */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold text-slate-800">Your Groups</CardTitle>
              <Link to={createPageUrl('Groups')}>
                <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupsLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-2xl" />
                ))
              ) : groups.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">No groups yet</p>
                  <Link to={createPageUrl('Groups')}>
                    <Button className="rounded-full bg-linear-to-r from-indigo-500 to-purple-600 hover:opacity-90">
                      <Plus className="w-4 h-4 mr-2" /> Create Group
                    </Button>
                  </Link>
                </div>
              ) : (
                groups.slice(0, 4).map((group: any) => {
                  const Icon = getGroupIcon(group.type);
                  return (
                    <Link 
                      key={group.id} 
                      to={`${createPageUrl('GroupDetail')}?id=${group.id}`}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-2xl bg-linear-to-br ${getGroupColor(group.type)} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{group.name}</p>
                        <p className="text-sm text-slate-500">{group.members?.length || 1} members</p>
                      </div>
                      <Badge variant="secondary" className="capitalize rounded-full">
                        {group.type}
                      </Badge>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold text-slate-800">Upcoming Events</CardTitle>
              <Link to={createPageUrl('Events')}>
                <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">No upcoming events</p>
                  <Link to={createPageUrl('Events')}>
                    <Button className="rounded-full bg-linear-to-r from-indigo-500 to-purple-600 hover:opacity-90">
                      <Plus className="w-4 h-4 mr-2" /> Create Event
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event: any) => {
                    return (
                      <div 
                        key={event.id} 
                        className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div 
                          className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg"
                          style={{ backgroundColor: event.color || '#5865F2' }}
                        >
                          <span className="text-xs font-medium opacity-80">
                            {format(new Date(event.date), 'MMM')}
                          </span>
                          <span className="text-xl font-bold leading-none">
                            {format(new Date(event.date), 'd')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{event.title}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            {event.start_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {event.start_time}
                              </span>
                            )}
                            {event.location_name && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {event.location_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge className="rounded-full" style={{ backgroundColor: event.color || '#5865F2' }}>
                          {formatEventDate(event.date)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tasks & Notes */}
      <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-slate-800">Recent Tasks</CardTitle>
            <Link to={createPageUrl('Tasks')}>
              <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="text-center py-6">
                <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No pending tasks</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTasks.map((task: any) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <div className={`w-3 h-3 rounded-full ${
                      task.label === 'important' ? 'bg-red-500' : 
                      task.label === 'doing' ? 'bg-amber-500' : 'bg-slate-300'
                    }`} />
                    <span className="flex-1 text-sm text-slate-700 truncate">{task.title}</span>
                    <Badge variant="outline" className="text-xs rounded-full capitalize">
                      {task.label}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-slate-800">Recent Notes</CardTitle>
            <Link to={createPageUrl('Notes')}>
              <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentNotes.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No notes yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentNotes.map((note: any) => (
                  <div key={note.id} className="p-3 rounded-xl bg-slate-50">
                    <p className="font-medium text-sm text-slate-800 truncate">{note.title}</p>
                    <p className="text-xs text-slate-500 mt-1">by {note.author_name || 'Unknown'}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}