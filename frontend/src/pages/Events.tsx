import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Plus, MapPin, Calendar, Clock, Search, Sparkles, 
  Navigation, Cloud, Sun, CloudRain, List, Map as MapIcon, Loader2
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import { format, isToday, isTomorrow, isPast } from 'date-fns';
// ✅ Real APIs and Types
import { userApi } from "@/api/user.api";
import { groupApi } from "@/api/group.api";
import { eventApi } from "@/api/event.api";
import type { User } from "@/types/user";
import type { Event, CreateEventPayload, UpdateEventPayload } from "@/types/event";

const customMarkerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Mock AI suggestions
const mockAISuggestions = [
  { title: "Romantic Dinner at Olive Garden", location: "Olive Garden Italian Restaurant", lat: 40.7128, lng: -74.006, type: 'date' },
  { title: "Weekend Hiking Trip", location: "Bear Mountain State Park", lat: 41.3128, lng: -74.006, type: 'trip' },
  { title: "Movie Night at AMC", location: "AMC Theatre Times Square", lat: 40.7580, lng: -73.9855, type: 'date' },
  { title: "Beach Day at Coney Island", location: "Coney Island Beach", lat: 40.5749, lng: -73.9859, type: 'trip' },
];

// Mock weather
const mockWeather: { [key: string]: { icon: any; label: string; temp: string; color: string } } = {
  'sunny': { icon: Sun, label: 'Sunny', temp: '72°F', color: 'text-amber-500' },
  'cloudy': { icon: Cloud, label: 'Cloudy', temp: '65°F', color: 'text-slate-500' },
  'rainy': { icon: CloudRain, label: 'Rainy', temp: '58°F', color: 'text-blue-500' },
};

function LocationMarker({ position, setPosition }: { position: { lat: number, lng: number } | null; setPosition: (pos: any) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? (
    <Marker position={position} icon={customMarkerIcon}>
      <Popup>Selected location</Popup>
    </Marker>
  ) : null;
}

export default function Events() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [eventModalOpen, setEventModalOpen] = useState<boolean>(false);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  
  // Strongly typed state
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [mapPosition, setMapPosition] = useState<{ lat: number, lng: number } | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  
  // Use CreateEventPayload for the form
  const [newEvent, setNewEvent] = useState<CreateEventPayload>({
    title: '',
    description: '',
    group_id: '',
    date: '',
    start_time: '',
    end_time: '',
    location_name: '',
    location_address: '',
    event_type: 'other',
    color: '#5865F2'
  });
  
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
      const userData: any = await userApi.getMe();
      setUser(userData);
    } catch (e) {
      console.error('Failed to load user', e);
    }
  };

  const { data: groups = [] } = useQuery({
    queryKey: ['groups', user?.email],
    queryFn: async () => {
      const allGroups = await groupApi.list();
      return allGroups; // Assuming backend handles filtering
    },
    enabled: !!user?.email,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', groups, selectedGroup],
    queryFn: async () => {
      const allEvents = await eventApi.list();
      const groupIds = selectedGroup === 'all' ? groups.map((g: any) => g.id) : [selectedGroup];
      return allEvents.filter((e: Event) => groupIds.includes(e.group_id));
    },
    enabled: groups.length > 0,
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: CreateEventPayload | UpdateEventPayload) => {
      if (editingEvent) {
        return await eventApi.update(editingEvent.id, eventData);
      }
      return await eventApi.create(eventData as CreateEventPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setEventModalOpen(false);
      setEditingEvent(null);
      resetNewEvent();
      toast.success(editingEvent ? 'Event updated!' : 'Event created!');
    },
    onError: () => {
      toast.error('Failed to save event. Please try again.');
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string): Promise<any> => eventApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted');
    },
  });

  const resetNewEvent = () => {
    setNewEvent({
      title: '',
      description: '',
      group_id: selectedGroup !== 'all' ? selectedGroup : (groups[0]?.id || ''),
      date: '',
      start_time: '',
      end_time: '',
      location_name: '',
      location_address: '',
      latitude: undefined,
      longitude: undefined,
      event_type: 'other',
      color: '#5865F2'
    });
    setMapPosition(null);
  };

  const openEditEvent = (event: Event): void => {
    setEditingEvent(event);
    const formattedDate = event.date ? new Date(event.date).toISOString().split('T')[0] : '';
    setNewEvent({
      title: event.title,
      description: event.description || '',
      group_id: event.group_id,
      date: formattedDate,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      location_name: event.location_name || '',
      location_address: event.location_address || '',
      latitude: event.latitude,
      longitude: event.longitude,
      event_type: event.event_type || 'other',
      color: event.color || '#5865F2'
    });
    if (event.latitude && event.longitude) {
      setMapPosition({ lat: event.latitude, lng: event.longitude });
    }
    setEventModalOpen(true);  
  };

  const handleAISuggest = () => {
    setIsGeneratingAI(true);
    // Simulate AI generation
    setTimeout(() => {
      setAiSuggestions(mockAISuggestions);
      setIsGeneratingAI(false);
    }, 1500);
  };

  const applyAISuggestion = (suggestion: any): void => {
    setNewEvent(prev => ({
      ...prev,
      title: suggestion.title,
      location_name: suggestion.location,
      latitude: suggestion.lat,
      longitude: suggestion.lng,
      event_type: suggestion.type
    }));
    setMapPosition({ lat: suggestion.lat, lng: suggestion.lng });
    setAiModalOpen(false);
    setEventModalOpen(true);
  };

  const getEventDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMM d');
  };

  const getRandomWeather = (date: string): any => {
    const weathers = Object.keys(mockWeather);
    const index = new Date(date).getDate() % weathers.length;
    return mockWeather[weathers[index]];
  };

  const filteredEvents = events.filter((event: Event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.location_name && event.location_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const upcomingEvents = filteredEvents
    .filter((e: Event) => !isPast(new Date(e.date)) || isToday(new Date(e.date)))
    .sort((a: Event, b: Event) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastEvents = filteredEvents
    .filter((e: Event) => isPast(new Date(e.date)) && !isToday(new Date(e.date)))
    .sort((a: Event, b: Event) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const upcomingEventsWithLocation = upcomingEvents.filter((e: Event) => e.latitude && e.longitude);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Events</h1>
          <p className="text-slate-500 mt-1">Plan activities with maps</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map((group: any) => (
                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* <Button 
            onClick={() => setAiModalOpen(true)}
            variant="outline"
            className="rounded-full border-purple-200 text-purple-600 hover:bg-purple-50"
          >
            <Sparkles className="w-4 h-4 mr-2" /> AI Suggest
          </Button> */}
          <Button 
            onClick={() => {
              resetNewEvent();
              setEventModalOpen(true);
            }}
            className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" /> New Event
          </Button>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 py-6 rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm"
          />
        </div>
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'list' | 'map')}>
          <TabsList className="rounded-xl bg-slate-100 p-1">
            <TabsTrigger value="list" className="rounded-lg">
              <List className="w-4 h-4 mr-2" /> List
            </TabsTrigger>
            <TabsTrigger value="map" className="rounded-lg">
              <MapIcon className="w-4 h-4 mr-2" /> Map
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="space-y-8">
          {/* Upcoming Events */}
          <div>
            <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Upcoming Events ({upcomingEvents.length})
            </h2>
            {upcomingEvents.length === 0 ? (
              <Card className="border-0 shadow-lg bg-white/80">
                <CardContent className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">No upcoming events</p>
                  <Button 
                    onClick={() => {
                      resetNewEvent();
                      setEventModalOpen(true);
                    }}
                    className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Create Event
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {upcomingEvents.map((event: Event) => {
                    const group = groups.find((g: any) => g.id === event.group_id);
                    const weather = getRandomWeather(event.date);
                    const WeatherIcon = weather.icon;
                    const eventDate = new Date(event.date);

                    return (
                      <motion.div
                        key={event.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <Card 
                          className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group bg-white/80 backdrop-blur-sm"
                          onClick={() => setViewingEvent(event)} // Mở chế độ View thay vì Edit
                        >
                          <div className="h-2 w-full transition-all duration-300 group-hover:h-3" style={{ backgroundColor: event.color || '#5865F2' }} />
                          <CardContent className="p-5">
                            <div className="flex items-start gap-4 mb-4">
                              {/* 📅 DIALOG LỊCH MINI SIÊU ĐẸP */}
                              <div 
                                className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white shadow-md relative overflow-hidden flex-shrink-0"
                                style={{ backgroundColor: event.color || '#5865F2' }}
                              >
                                <div className="absolute top-0 inset-x-0 h-5 bg-black/10 flex items-center justify-center">
                                  <span className="text-[10px] uppercase font-bold tracking-widest">{format(eventDate, 'MMM')}</span>
                                </div>
                                <span className="text-2xl font-black mt-3 leading-none">{format(eventDate, 'dd')}</span>
                                <span className="text-[10px] font-medium opacity-90 capitalize mt-0.5">{format(eventDate, 'EEEE')}</span>
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                  {event.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-500">
                                  <Clock className="w-4 h-4 text-slate-400" />
                                  <span>{event.start_time ? `${event.start_time} ${event.end_time ? `- ${event.end_time}` : ''}` : 'All Day'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3 mt-4">
                              {/* Hiển thị địa chỉ rút gọn */}
                              <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <MapPin className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-700 truncate">{event.location_name || 'No specific location'}</p>
                                  {event.location_address && (
                                    <p className="text-xs text-slate-400 truncate mt-0.5">{event.location_address}</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-full">
                                  <WeatherIcon className={`w-3.5 h-3.5 ${weather.color}`} />
                                  <span className="text-xs font-medium text-slate-600">{weather.temp}</span>
                                </div>
                                {group && (
                                  <Badge variant="outline" className="rounded-full bg-white text-xs text-slate-500 border-slate-200 shadow-sm">
                                    {group.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-400 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Past Events ({pastEvents.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                {pastEvents.slice(0, 6).map((event: Event) => {
                  return (
                    <Card 
                      key={event.id}
                      className="border-0 shadow-lg cursor-pointer"
                      onClick={() => openEditEvent(event)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: event.color || '#5865F2' }}
                          >
                            {format(new Date(event.date), 'd')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 truncate">{event.title}</p>
                            <p className="text-xs text-slate-500">{format(new Date(event.date), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card className="border-0 shadow-xl overflow-hidden rounded-3xl">
          {/* 👇 z-[0] cực kỳ quan trọng để bản đồ không đè lên các Modal (Dialog) */}
          <div className="h-[650px] relative z-[0]">
            <MapContainer
              // Lấy toạ độ của event đầu tiên làm trung tâm, nếu không có thì mặc định ở Đà Nẵng
              center={upcomingEventsWithLocation[0] 
                ? [upcomingEventsWithLocation[0].latitude!, upcomingEventsWithLocation[0].longitude!] 
                : [16.0470, 108.2062]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {upcomingEventsWithLocation.map((event: Event) => (
                <Marker 
                  key={event.id} 
                  position={[event.latitude!, event.longitude!]}
                  icon={customMarkerIcon}
                >
                  {/* 1. TOOLTIP (Luôn hiển thị khi không click) */}
                  <Tooltip 
                    direction="top" 
                    offset={[0, -40]} 
                    permanent 
                    className="bg-white/95 backdrop-blur-sm border-0 shadow-lg rounded-full px-3 py-1.5 text-xs font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: event.color || '#5865F2' }} />
                      <span className="text-slate-800">{format(new Date(event.date), 'MMM dd')}</span>
                      <span className="text-slate-400 font-normal truncate max-w-[120px]">{event.title}</span>
                    </div>
                  </Tooltip>

                  {/* 2. POPUP (Hiển thị khi Click vào Marker) */}
                  <Popup minWidth={280} className="rounded-2xl">
                    <div className="p-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="rounded-full text-[10px] uppercase px-2 py-0.5" style={{ color: event.color || '#5865F2', backgroundColor: `${event.color}15` }}>
                          {event.event_type || 'Event'}
                        </Badge>
                      </div>
                      
                      <h3 className="font-bold text-lg text-slate-800 mb-4 leading-tight">{event.title}</h3>
                      
                      <div className="space-y-2.5 mb-4">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <Calendar className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          <span className="font-medium">{format(new Date(event.date), 'EEEE, MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <span>{event.start_time ? `${event.start_time} - ${event.end_time || 'Late'}` : 'All day'}</span>
                        </div>
                        <div className="flex items-start gap-3 text-sm text-slate-600">
                          <MapPin className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-700">{event.location_name || 'Pinned Location'}</span>
                            {event.location_address && (
                              <span className="text-xs text-slate-500 mt-0.5 leading-snug">{event.location_address}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                          "{event.description}"
                        </p>
                      )}

                      <Button 
                        size="sm" 
                        className="w-full rounded-full bg-slate-900 text-white hover:bg-slate-800 h-9"
                        onClick={(e) => {
                          e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài bản đồ
                          setViewingEvent(event); // 👉 Mở Modal chi tiết cực đẹp mà chúng ta làm lúc nãy
                        }}
                      >
                        View Full Details
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </Card>
      )}

      {/* AI Suggestions Modal */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI Event Suggestions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {aiSuggestions.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">Get AI-powered suggestions for your next event</p>
                <Button 
                  onClick={handleAISuggest}
                  disabled={isGeneratingAI}
                  className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Suggestions
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {aiSuggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => applyAISuggestion(suggestion)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800">{suggestion.title}</h4>
                        <p className="text-sm text-slate-500">{suggestion.location}</p>
                        <Badge variant="secondary" className="mt-2 rounded-full capitalize">
                          {suggestion.type}
                        </Badge>
                      </div>
                      <Navigation className="w-5 h-5 text-purple-400" />
                    </div>
                  </motion.div>
                ))}
                <Button 
                  onClick={handleAISuggest}
                  variant="outline"
                  className="w-full rounded-full"
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Generate More
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Modal */}
      <Dialog open={eventModalOpen} onOpenChange={(open) => {
        setEventModalOpen(open);
        if (!open) {
          setEditingEvent(null);
          resetNewEvent();
        }
      }}>
        <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
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
                    {groups.map((group: any) => (
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
                  value={newEvent.end_time || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location Name</Label>
              <Input
                value={newEvent.location_name || ''}
                onChange={(e) => setNewEvent({ ...newEvent, location_name: e.target.value })}
                placeholder="e.g., Central Park"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Select Location on Map (click to pin)</Label>
              <div className="h-64 rounded-xl overflow-hidden border">
                <MapContainer
                  center={mapPosition || [16.0470, 108.2062]} // Default to Da Nang if no position
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker 
                    position={mapPosition} 
                    setPosition={async (pos) => {
                      // 1. Instantly set pin and loading state
                      setMapPosition(pos);
                      setNewEvent(prev => ({
                        ...prev,
                        latitude: pos.lat,
                        longitude: pos.lng,
                        location_address: 'Fetching address...' 
                      }));

                      // 2. Fortified API Call
                      try {
                        // Using format=jsonv2 and adding accept-language
                        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.lat}&lon=${pos.lng}&accept-language=en`;
                        
                        const response = await fetch(url, {
                          method: 'GET',
                          headers: {
                            'Accept': 'application/json'
                          }
                        });

                        if (!response.ok) {
                          throw new Error(`HTTP error! status: ${response.status}`);
                        }

                        const data = await response.json();
                        
                        if (data && data.display_name) {
                          // Successfully found address
                          setNewEvent(prev => ({
                            ...prev,
                            location_address: data.display_name 
                          }));
                        } else {
                          // API responded but no address found for these coordinates
                          setNewEvent(prev => ({ 
                            ...prev, 
                            location_address: 'Address not found for this location' 
                          }));
                        }
                      } catch (error) {
                        console.error("Geocoding Error:", error);
                        // Fallback text if the API completely fails
                        setNewEvent(prev => ({ 
                          ...prev, 
                          location_address: 'Location pinned (Address fetch failed)' 
                        }));
                      }
                    }} 
                  />
                </MapContainer>
              </div>
              
              {/* 3. Address Display Box */}
              {mapPosition && (
                <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                  <p className="text-slate-700 font-medium flex items-center gap-1 mb-1">
                    <MapPin className="w-4 h-4 text-indigo-500" /> Specific Address
                  </p>
                  <p className="text-slate-600 line-clamp-2" title={newEvent.location_address}>
                    {newEvent.location_address || "Click map to get address"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Coordinates: {mapPosition.lat.toFixed(5)}, {mapPosition.lng.toFixed(5)}
                  </p>
                </div>
              )}
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
                value={newEvent.description || ''}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Event description"
                className="rounded-xl"
              />
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
      {/* ===== EVENT DETAIL VIEW MODAL ===== */}
      <Dialog open={!!viewingEvent} onOpenChange={(open) => !open && setViewingEvent(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
          {viewingEvent && (
            <>
              {/* Header Banner */}
              <div className="h-24 relative flex items-end p-6" style={{ backgroundColor: viewingEvent.color || '#5865F2' }}>
                <div className="absolute top-3 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-medium">
                  {viewingEvent.event_type}
                </div>
                <h2 className="text-2xl font-bold text-white drop-shadow-md">{viewingEvent.title}</h2>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Date</p>
                      <p className="text-sm font-semibold text-slate-800">{format(new Date(viewingEvent.date), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Time</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {viewingEvent.start_time ? `${viewingEvent.start_time} - ${viewingEvent.end_time || 'Late'}` : 'All day'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Location</h4>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-800">{viewingEvent.location_name || 'No location name'}</p>
                        {viewingEvent.location_address && (
                          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{viewingEvent.location_address}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {viewingEvent.description && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Details</h4>
                      <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {viewingEvent.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <Button 
                    variant="outline" 
                    className="flex-1 rounded-full"
                    onClick={() => setViewingEvent(null)}
                  >
                    Close
                  </Button>
                  <Button 
                    className="flex-1 rounded-full bg-slate-900 text-white hover:bg-slate-800"
                    onClick={() => {
                      setViewingEvent(null);
                      openEditEvent(viewingEvent);
                    }}
                  >
                    Edit Event
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}