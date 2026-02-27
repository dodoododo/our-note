import { useState, useEffect } from 'react';
import { mockApiClient } from '@/lib/mockApiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, 
  Clock, MapPin, Cloud, Sun, CloudRain, Snowflake, Repeat, Bell, Users, CheckCircle, XCircle, HelpCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from 'framer-motion';
import { toast } from "sonner";
import DateEventsModal from '../components/calendar/DateEventsModal.tsx';
import EventDetailModal from '../components/calendar/EventDetailModal.tsx';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
  parseISO, setYear
} from 'date-fns';

// Mock weather data
const mockWeather: { [key: string]: { icon: any; label: string; temp: string } } = {
  'sunny': { icon: Sun, label: 'Sunny', temp: '72°F' },
  'cloudy': { icon: Cloud, label: 'Cloudy', temp: '65°F' },
  'rainy': { icon: CloudRain, label: 'Rainy', temp: '58°F' },
  'snowy': { icon: Snowflake, label: 'Snow', temp: '32°F' },
};

export default function Calendar() {
  const [user, setUser] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [eventModalOpen, setEventModalOpen] = useState<boolean>(false);
  const [dateEventsModalOpen, setDateEventsModalOpen] = useState<boolean>(false);
  const [eventDetailModalOpen, setEventDetailModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [viewingEvent, setViewingEvent] = useState<any>(null);
  const urlParams = new URLSearchParams(window.location.search);
  const initialGroup = urlParams.get('group');
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
    if (initialGroup) {
      setSelectedGroup(initialGroup);
    }
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

  const { data: events = [] } = useQuery({
    queryKey: ['events', groups, selectedGroup],
    queryFn: async () => {
      const groupIds = selectedGroup === 'all' 
        ? groups.map(g => g.id)
        : [selectedGroup];
      const allEvents = await mockApiClient.entities.Event.list();
      return allEvents.filter(e => groupIds.includes(e.group_id));
    },
    enabled: groups.length > 0,
  });

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    group_id: '',
    date: '',
    start_time: '',
    end_time: '',
    location_name: '',
    event_type: 'other',
    color: '#5865F2',
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_end_date: '',
    reminder_minutes: 30,
    rsvp_enabled: false,
    attendees: []
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      if (editingEvent) {
        return await mockApiClient.entities.Event.update(editingEvent.id, eventData);
      }
      
      // If recurring, create multiple instances
      if (eventData.is_recurring && eventData.recurrence_pattern && eventData.recurrence_end_date) {
        const parentEvent = await mockApiClient.entities.Event.create({ ...eventData, parent_event_id: null });
        const instances = generateRecurringInstances(eventData, parentEvent.id);
        for (const instance of instances) {
          await mockApiClient.entities.Event.create(instance);
        }
        return parentEvent;
      }
      
      return await mockApiClient.entities.Event.create(eventData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setEventModalOpen(false);
      setEditingEvent(null);
      resetNewEvent();
      toast.success(editingEvent ? 'Event updated!' : 'Event created!');
    },
  });

  const generateRecurringInstances = (eventData: any, parentId: string): any[] => {
    const instances = [];
    let currentDate = new Date(eventData.date);
    const endDate = new Date(eventData.recurrence_end_date);
    
    while (currentDate <= endDate) {
      // Skip the first occurrence (it's the parent)
      if (currentDate.getTime() !== new Date(eventData.date).getTime()) {
        instances.push({
          ...eventData,
          date: format(currentDate, 'yyyy-MM-dd'),
          parent_event_id: parentId,
          is_recurring: false
        });
      }
      
      // Increment date based on pattern
      switch (eventData.recurrence_pattern) {
        case 'daily':
          currentDate = addDays(currentDate, 1);
          break;
        case 'weekly':
          currentDate = addDays(currentDate, 7);
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, 1);
          break;
        case 'yearly':
          currentDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1));
          break;
      }
    }
    
    return instances;
  };

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => mockApiClient.entities.Event.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted');
    },
  });

  const resetNewEvent = () => {
    setNewEvent({
      title: '',
      description: '',
      group_id: groups[0]?.id || '',
      date: '',
      start_time: '',
      end_time: '',
      location_name: '',
      event_type: 'other',
      color: '#5865F2',
      is_recurring: false,
      recurrence_pattern: 'weekly',
      recurrence_end_date: '',
      reminder_minutes: 30,
      rsvp_enabled: false,
      attendees: []
    });
  };

  const handleDateClick = (date: Date): void => {
    setSelectedDate(date);
    setDateEventsModalOpen(true);
  };

  const handleAddEventFromDate = (): void => {
    if (!selectedDate) return;
    setDateEventsModalOpen(false);
    setNewEvent(prev => ({ 
      ...prev, 
      date: format(selectedDate, 'yyyy-MM-dd'), 
      group_id: selectedGroup !== 'all' ? selectedGroup : (groups[0]?.id || '') 
    }));
    setEventModalOpen(true);
  };

  const handleViewEvent = (event: any): void => {
    setViewingEvent(event);
    setDateEventsModalOpen(false);
    setEventDetailModalOpen(true);
  };

  const handleEditEvent = (event: any): void => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      description: event.description || '',
      group_id: event.group_id,
      date: event.date,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      location_name: event.location_name || '',
      event_type: event.event_type || 'other',
      color: event.color || '#5865F2',
      is_recurring: event.is_recurring || false,
      recurrence_pattern: event.recurrence_pattern || 'weekly',
      recurrence_end_date: event.recurrence_end_date || '',
      reminder_minutes: event.reminder_minutes || 30,
      rsvp_enabled: event.rsvp_enabled || false,
      attendees: event.attendees || []
    });
    setEventModalOpen(true);
  };

  const handleRSVP = async (eventId: string, status: string): Promise<void> => {
    if (!user) return;
    const event = events.find((e: any) => e.id === eventId);
    if (!event) return;
    
    const updatedRSVPs = {
      ...(event.rsvp_responses || {}),
      [user.email]: status
    };
    
    await mockApiClient.entities.Event.update(eventId, {
      rsvp_responses: updatedRSVPs
    });
    
    queryClient.invalidateQueries({ queryKey: ['events'] });
    toast.success(`RSVP updated to: ${status}`);
  };

  // Calendar rendering
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const generateDays = () => {
    const days = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const getEventsForDay = (day: Date): any[] => {
    return events.filter(event => isSameDay(parseISO(event.date), day));
  };

  const getRandomWeather = (day: Date): any => {
    const weathers = Object.keys(mockWeather);
    const index = day.getDate() % weathers.length;
    return mockWeather[weathers[index]];
  };

  // Year selector (2015 to current year + 10)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2015 + 11 }, (_, i) => 2015 + i);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Calendar</h1>
          <p className="text-slate-500 mt-1">View and manage your events</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => {
              resetNewEvent();
              setSelectedDate(new Date());
              setNewEvent(prev => ({ ...prev, date: format(new Date(), 'yyyy-MM-dd'), group_id: selectedGroup !== 'all' ? selectedGroup : (groups[0]?.id || '') }));
              setEventModalOpen(true);
            }}
            className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Event
          </Button>
        </div>
      </div>

      {/* Calendar Card */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="rounded-xl">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800">
                  {format(currentDate, 'MMMM')}
                </h2>
                <Select 
                  value={currentDate.getFullYear().toString()} 
                  onValueChange={(year) => setCurrentDate(setYear(currentDate, parseInt(year)))}
                >
                  <SelectTrigger className="w-24 rounded-xl border-0 bg-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="rounded-xl">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setCurrentDate(new Date())}
              className="rounded-full"
            >
              Today
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {generateDays().map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const weather = getRandomWeather(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              
              return (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleDateClick(day)}
                  className={`min-h-[100px] p-2 rounded-xl border cursor-pointer transition-colors ${
                    isToday(day) 
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-transparent' 
                      : isSelected 
                        ? 'bg-indigo-50 border-indigo-200' 
                        : isCurrentMonth 
                          ? 'bg-white border-slate-100 hover:border-indigo-200' 
                          : 'bg-slate-50 border-slate-50 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold ${isToday(day) ? 'text-white' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    {isCurrentMonth && (
                      <weather.icon className={`w-3 h-3 ${isToday(day) ? 'text-white/80' : 'text-slate-400'}`} />
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewEvent(event);
                        }}
                        className="text-xs truncate px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: isToday(day) ? 'rgba(255,255,255,0.2)' : event.color + '20', color: isToday(day) ? 'white' : event.color }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className={`text-xs ${isToday(day) ? 'text-white/80' : 'text-slate-500'}`}>
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events Sidebar */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-500" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.filter(e => new Date(e.date) >= new Date()).length === 0 ? (
            <div className="text-center py-6">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No upcoming events</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events
                .filter(e => new Date(e.date) >= new Date())
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 6)
                .map(event => {
                  const group = groups.find(g => g.id === event.group_id);
                  const weather = getRandomWeather(new Date(event.date));
                  return (
                    <div 
                      key={event.id}
                      onClick={() => handleViewEvent(event)}
                      className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: event.color || '#5865F2' }}
                        >
                          {format(new Date(event.date), 'd')}
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <weather.icon className="w-4 h-4" />
                          <span className="text-xs">{weather.temp}</span>
                        </div>
                      </div>
                      <h3 className="font-semibold text-slate-800 mb-1">{event.title}</h3>
                      <div className="space-y-1 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.start_time || 'All day'}
                        </div>
                        {event.location_name && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location_name}
                          </div>
                        )}
                        {event.is_recurring && (
                          <div className="flex items-center gap-1 text-indigo-600">
                            <Repeat className="w-3 h-3" />
                            Recurring
                          </div>
                        )}
                        {/* {event.rsvp_enabled && (
                          <div className="flex items-center gap-1 text-emerald-600">
                            <Users className="w-3 h-3" />
                            {Object.values(event.rsvp_responses || {}).filter(r => r === 'yes').length} attending
                          </div>
                        )} */}
                      </div>
                      {group && (
                        <Badge variant="secondary" className="mt-2 rounded-full text-xs">
                          {group.name}
                        </Badge>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date Events Modal */}
      <DateEventsModal
        date={selectedDate}
        events={selectedDate ? getEventsForDay(selectedDate) : []}
        onClose={() => {
          setDateEventsModalOpen(false);
          setSelectedDate(null);
        }}
        onEventClick={handleViewEvent}
        onAddEvent={handleAddEventFromDate}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        event={viewingEvent}
        groups={groups}
        onClose={() => {
          setEventDetailModalOpen(false);
          setViewingEvent(null);
        }}
        onEdit={handleEditEvent}
        onDelete={(id) => deleteEventMutation.mutate(id)}
        onRSVP={user ? {
          userEmail: user.email,
          handler: handleRSVP
        } : undefined}
      />

      {/* Create/Edit Event Modal */}
      <Dialog open={eventModalOpen} onOpenChange={(open) => {
        setEventModalOpen(open);
        if (!open) {
          setEditingEvent(null);
          resetNewEvent();
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Event title"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="rounded-xl"
                  min="2015-01-01"
                />
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <Select value={newEvent.group_id} onValueChange={(v) => setNewEvent({ ...newEvent, group_id: v })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newEvent.start_time}
                  onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newEvent.end_time}
                  onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={newEvent.location_name}
                onChange={(e) => setNewEvent({ ...newEvent, location_name: e.target.value })}
                placeholder="Event location"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={newEvent.event_type} onValueChange={(v) => setNewEvent({ ...newEvent, event_type: v })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="trip">Trip</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="celebration">Celebration</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {['#5865F2', '#ED4245', '#57F287', '#FEE75C', '#EB459E', '#9B59B6'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewEvent({ ...newEvent, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${newEvent.color === color ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Event description"
                className="rounded-xl"
              />
            </div>

            <Separator />

            {/* Recurring Event */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-indigo-500" />
                  <Label>Recurring Event</Label>
                </div>
                <Switch
                  checked={newEvent.is_recurring}
                  onCheckedChange={(checked) => setNewEvent({ ...newEvent, is_recurring: checked })}
                  disabled={!!editingEvent}
                />
              </div>
              {newEvent.is_recurring && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label>Repeat</Label>
                    <Select value={newEvent.recurrence_pattern} onValueChange={(v) => setNewEvent({ ...newEvent, recurrence_pattern: v })}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Until</Label>
                    <Input
                      type="date"
                      value={newEvent.recurrence_end_date}
                      onChange={(e) => setNewEvent({ ...newEvent, recurrence_end_date: e.target.value })}
                      className="rounded-xl"
                      min={newEvent.date}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Reminder */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-500" />
                <Label>Reminder</Label>
              </div>
              <Select value={newEvent.reminder_minutes?.toString() || '30'} onValueChange={(v) => setNewEvent({ ...newEvent, reminder_minutes: parseInt(v) })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No reminder</SelectItem>
                  <SelectItem value="15">15 minutes before</SelectItem>
                  <SelectItem value="30">30 minutes before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                  <SelectItem value="1440">1 day before</SelectItem>
                  <SelectItem value="10080">1 week before</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* RSVP */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <Label>Enable RSVPs</Label>
                </div>
                <Switch
                  checked={newEvent.rsvp_enabled}
                  onCheckedChange={(checked) => setNewEvent({ ...newEvent, rsvp_enabled: checked })}
                />
              </div>
              {editingEvent?.rsvp_enabled && (
                <div className="pl-6 space-y-2">
                  <p className="text-sm text-slate-600">RSVP Responses:</p>
                  <div className="space-y-2">
                    {Object.entries(editingEvent.rsvp_responses || {}).map(([email, status]) => {
                      const group = groups.find(g => g.id === editingEvent.group_id);
                      const memberName = group?.member_names?.[email] || email;
                      return (
                        <div key={email} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">{memberName}</span>
                          <Badge className={
                            status === 'yes' ? 'bg-emerald-100 text-emerald-700' :
                            status === 'no' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }>
                            {status === 'yes' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {status === 'no' && <XCircle className="w-3 h-3 mr-1" />}
                            {status === 'maybe' && <HelpCircle className="w-3 h-3 mr-1" />}
                            {(status as string)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  {editingEvent.rsvp_enabled && !editingEvent.rsvp_responses?.[user?.email] && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => handleRSVP(editingEvent.id, 'yes')} className="flex-1 rounded-full">
                        <CheckCircle className="w-3 h-3 mr-1" /> Yes
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRSVP(editingEvent.id, 'maybe')} className="flex-1 rounded-full">
                        <HelpCircle className="w-3 h-3 mr-1" /> Maybe
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRSVP(editingEvent.id, 'no')} className="flex-1 rounded-full">
                        <XCircle className="w-3 h-3 mr-1" /> No
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              {editingEvent && (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    deleteEventMutation.mutate(editingEvent.id);
                    setEventModalOpen(false);
                    setEditingEvent(null);
                  }}
                  className="rounded-full"
                >
                  Delete
                </Button>
              )}
              <Button 
                onClick={() => createEventMutation.mutate(newEvent)}
                disabled={!newEvent.title || !newEvent.date || !newEvent.group_id || createEventMutation.isPending}
                className="flex-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
              >
                {createEventMutation.isPending ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}