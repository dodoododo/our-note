import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, Calendar, CheckSquare, FileText, MapPin, Heart, 
  ArrowRight, Plus, Clock, TrendingUp, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isTomorrow } from 'date-fns';

// ✅ Import Real APIs
import { userApi } from "@/api/user.api";
import { groupApi } from "@/api/group.api";
import { eventApi } from "@/api/event.api";
import { taskApi } from "@/api/task.api";
import { noteApi } from "@/api/note.api";

export default function Home() {
  const [user, setUser] = useState<any>(null);
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

  // --- Cursor Trail Logic ---
  const headerRef = useRef<HTMLDivElement>(null);
  const [trail, setTrail] = useState<{ id: number; x: number; y: number; icon: string }[]>([]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!headerRef.current) return;
    const rect = headerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const icons = ['✨', '💖', '🌟', '🫧', '🌸'];
    const randomIcon = icons[Math.floor(Math.random() * icons.length)];

    const newParticle = { 
      id: performance.now() + Math.random(), 
      x, 
      y, 
      icon: randomIcon 
    };

    setTrail((prev) => [...prev.slice(-15), newParticle]);

    setTimeout(() => {
      setTrail((prev) => prev.filter((p) => p.id !== newParticle.id));
    }, 500);
  };

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
      {/* Welcome Header with Cute Interactive Cursor Trail */}
      <motion.div 
        variants={itemVariants} 
        ref={headerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTrail([])} 
        className="relative overflow-hidden rounded-3xl bg-linear-to-r from-purple-500 to-pink-400 p-8 lg:p-12 text-white shadow-xl cursor-default"
      >
        {/* Animated Background Blobs */}
        <div className="absolute top-[-50%] left-[-10%] w-96 h-96 bg-white/20 blur-3xl rounded-full animate-pulse pointer-events-none" />
        <div className="absolute bottom-[-50%] right-[10%] w-80 h-80 bg-pink-400/30 blur-3xl rounded-full animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

        {/* Trail Particles */}
        <AnimatePresence>
          {trail.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ opacity: 1, scale: 0, x: particle.x, y: particle.y }}
              animate={{ 
                opacity: 0, 
                scale: 1.5, 
                y: particle.y - 40,
                rotate: Math.random() * 90 - 45 
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute pointer-events-none z-0 text-xl"
              style={{ left: -10, top: -10 }} 
            >
              {particle.icon}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Content */}
        <div className="relative z-10">
          <motion.div 
            className="flex items-center gap-2 mb-3 bg-white/20 w-fit px-4 py-1.5 rounded-full backdrop-blur-md border border-white/20 shadow-sm"
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
            <span className="text-white/90 text-sm font-semibold tracking-wide uppercase">Welcome back</span>
          </motion.div>
          
          <h1 className="text-4xl lg:text-5xl font-black mb-3 drop-shadow-md tracking-tight">
            {randomGreeting}, {displayName}! 
          </h1>
          <p className="text-white/90 text-lg font-medium max-w-xl leading-relaxed drop-shadow-sm">
            You have <span className="bg-white/20 px-2 py-0.5 rounded-lg mx-1">{upcomingEvents.length} upcoming events</span> 
            and <span className="bg-white/20 px-2 py-0.5 rounded-lg mx-1">{recentTasks.length} tasks</span> to complete.
          </p>
        </div>

        {/* Decorative Graphic */}
        <motion.div 
          className="absolute right-0 bottom-0 opacity-15 pointer-events-none"
          animate={{ 
            y: [0, -15, 0],
            rotate: [0, 5, -5, 0] 
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          <Heart className="w-64 h-64 -mr-12 -mb-12 fill-white" />
        </motion.div>
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