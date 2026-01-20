import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { mockApiClient } from '@/lib/mockApiClient';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, Calendar, CheckSquare, FileText, MapPin, Heart, 
  ArrowRight, Plus, Clock, TrendingUp, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from 'framer-motion';
import { format, isToday, isTomorrow } from 'date-fns';

export default function Home() {
  const [user, setUser] = useState<any>(null);

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

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['groups', user?.email],
    queryFn: async () => {
      const allGroups = await mockApiClient.entities.Group.list();
      return allGroups.filter(g => g.members?.includes(user?.email) || g.owner === user?.email);
    },
    enabled: !!user?.email,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['upcomingEvents', groups],
    queryFn: async () => {
      const groupIds = groups.map(g => g.id);
      const allEvents = await mockApiClient.entities.Event.list();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return allEvents
        .filter(e => groupIds.includes(e.group_id) && new Date(e.date) >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);
    },
    enabled: groups.length > 0,
  });

  const { data: recentTasks = [] } = useQuery({
    queryKey: ['recentTasks', groups],
    queryFn: async () => {
      const groupIds = groups.map(g => g.id);
      const allTasks = await mockApiClient.entities.Task.list('-created_date', 10);
      return allTasks.filter(t => groupIds.includes(t.group_id) && !t.completed).slice(0, 5);
    },
    enabled: groups.length > 0,
  });

  const { data: recentNotes = [] } = useQuery({
    queryKey: ['recentNotes', groups],
    queryFn: async () => {
      const groupIds = groups.map(g => g.id);
      const allNotes = await mockApiClient.entities.Note.list('-created_date', 5);
      return allNotes.filter(n => groupIds.includes(n.group_id));
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
      case 'couple': return 'from-pink-500 to-rose-500';
      case 'family': return 'from-indigo-500 to-purple-500';
      case 'work': return 'from-emerald-500 to-teal-500';
      default: return 'from-blue-500 to-cyan-500';
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
      transition: {
        staggerChildren: 0.1
      }
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
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="max-w-7xl mx-auto space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-8 lg:p-12 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-white/80 text-sm font-medium">Welcome back</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">
            Hello, {user.full_name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-white/80 text-lg">
            You have {upcomingEvents.length} upcoming events and {recentTasks.length} tasks to complete
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10">
          <Heart className="w-64 h-64 -mr-16 -mb-16" />
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
                    <Button className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90">
                      <Plus className="w-4 h-4 mr-2" /> Create Group
                    </Button>
                  </Link>
                </div>
              ) : (
                groups.slice(0, 4).map((group) => {
                  const Icon = getGroupIcon(group.type);
                  return (
                    <Link 
                      key={group.id} 
                      to={`${createPageUrl('GroupDetail')}?id=${group.id}`}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getGroupColor(group.type)} flex items-center justify-center shadow-lg`}>
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
                    <Button className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90">
                      <Plus className="w-4 h-4 mr-2" /> Create Event
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => {
                    const _group = groups.find(g => g.id === event.group_id);
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
                {recentTasks.map((task) => (
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
                {recentNotes.map((note) => (
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