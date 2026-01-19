import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { mockApiClient } from '@/lib/mockApiClient';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, Heart, Settings, Calendar, CheckSquare, FileText, 
  MapPin, UserPlus, ArrowLeft, Clock, MessageCircle, Palette
} from 'lucide-react';
import PresenceIndicator from '../components/groups/PresenceIndicator';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import CoupleAnniversary from '../components/groups/CoupleAnniversary';

export default function GroupDetail() {
  const [user, setUser] = useState<any>(null);
  const urlParams = new URLSearchParams(window.location.search);
  const groupId = urlParams.get('id');

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

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => mockApiClient.entities.Group.filter({ id: groupId }).then(r => r[0]),
    enabled: !!groupId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['groupEvents', groupId],
    queryFn: async () => {
      const allEvents = await mockApiClient.entities.Event.filter({ group_id: groupId });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return allEvents.filter(e => new Date(e.date) >= today).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);
    },
    enabled: !!groupId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['groupTasks', groupId],
    queryFn: () => mockApiClient.entities.Task.filter({ group_id: groupId, completed: false }),
    enabled: !!groupId,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['groupNotes', groupId],
    queryFn: () => mockApiClient.entities.Note.filter({ group_id: groupId }),
    enabled: !!groupId,
  });

  const getGroupColor = (type: string): string => {
    switch (type) {
      case 'couple': return 'from-pink-500 to-rose-500';
      case 'family': return 'from-indigo-500 to-purple-500';
      case 'work': return 'from-emerald-500 to-teal-500';
      default: return 'from-blue-500 to-cyan-500';
    }
  };

  const getGroupIcon = (type: string) => {
    switch (type) {
      case 'couple': return Heart;
      default: return Users;
    }
  };

  const getInitials = (name: string): string => {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading || !group) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const Icon = getGroupIcon(group.type);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={createPageUrl('Groups')}>
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getGroupColor(group.type)} flex items-center justify-center shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{group.name}</h1>
              <p className="text-slate-500">{group.description || 'No description'}</p>
            </div>
          </div>
        </div>
        <Link to={`${createPageUrl('GroupSettings')}?id=${groupId}`}>
          <Button variant="outline" className="rounded-full">
            <Settings className="w-4 h-4 mr-2" /> Settings
          </Button>
        </Link>
      </div>

      {/* Couple Anniversary Widget */}
      {group.type === 'couple' && (
        <CoupleAnniversary group={group} />
      )}

      {/* Online Members */}
      <PresenceIndicator group={group} />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to={`${createPageUrl('GroupChat')}?id=${groupId}`} className="block">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 bg-white/80 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
              <p className="font-semibold text-slate-800">Chat</p>
              <p className="text-sm text-slate-500">Send messages</p>
            </CardContent>
          </Card>
        </Link>
        <Link to={`${createPageUrl('Calendar')}?group=${groupId}`} className="block">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 bg-white/80 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <p className="font-semibold text-slate-800">Calendar</p>
              <p className="text-sm text-slate-500">{events.length} upcoming</p>
            </CardContent>
          </Card>
        </Link>
        <Link to={`${createPageUrl('Tasks')}?group=${groupId}`} className="block">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 bg-white/80 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckSquare className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="font-semibold text-slate-800">Tasks</p>
              <p className="text-sm text-slate-500">{tasks.length} active</p>
            </CardContent>
          </Card>
        </Link>
        <Link to={`${createPageUrl('Notes')}?group=${groupId}`} className="block">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 bg-white/80 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
              <p className="font-semibold text-slate-800">Notes</p>
              <p className="text-sm text-slate-500">{notes.length} notes</p>
            </CardContent>
          </Card>
        </Link>
        <Link to={`${createPageUrl('Events')}?group=${groupId}`} className="block">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 bg-white/80 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-pink-600" />
              </div>
              <p className="font-semibold text-slate-800">Events</p>
              <p className="text-sm text-slate-500">Plan together</p>
            </CardContent>
          </Card>
        </Link>
        <Link to={`${createPageUrl('Whiteboard')}?group=${groupId}`} className="block">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 bg-white/80 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
                <Palette className="w-6 h-6 text-violet-600" />
              </div>
              <p className="font-semibold text-slate-800">Whiteboard</p>
              <p className="text-sm text-slate-500">Draw together</p>
            </CardContent>
          </Card>
        </Link>
        </div>

      {/* Members & Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Members */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Members ({group.members?.length || 1})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.members?.map((email: string) => (
              <div key={email} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <Avatar className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500">
                  <AvatarFallback className="bg-transparent text-white text-sm">
                    {getInitials(group.member_names?.[email])}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {group.member_names?.[email] || email}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{email}</p>
                </div>
                {email === group.owner && (
                  <Badge className="rounded-full bg-indigo-100 text-indigo-700">Owner</Badge>
                )}
              </div>
            ))}
            {group.owner === user?.email && (
              <Link to={`${createPageUrl('GroupSettings')}?id=${groupId}`}>
                <Button variant="outline" className="w-full rounded-full mt-2">
                  <UserPlus className="w-4 h-4 mr-2" /> Invite Members
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-pink-500" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No upcoming events</p>
                <Link to={`${createPageUrl('Events')}?group=${groupId}`}>
                  <Button className="mt-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600">
                    Create Event
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50">
                    <div 
                      className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white"
                      style={{ backgroundColor: event.color || '#5865F2' }}
                    >
                      <span className="text-xs opacity-80">{format(new Date(event.date), 'MMM')}</span>
                      <span className="text-xl font-bold">{format(new Date(event.date), 'd')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{event.title}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}