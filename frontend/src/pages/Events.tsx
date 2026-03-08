import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Plus, MapPin, Calendar, Clock, Search, Sparkles, 
  Navigation, List, Map as MapIcon, Loader2, X, Edit2
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
import WeatherBadge from '@/components/custom-ui/weather-badge';

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
  
  // 🌟 NEW: Device Geolocation State (Để gọi thời tiết chính xác nếu Event không có tọa độ)
  const [deviceLocation, setDeviceLocation] = useState<{lat: number, lng: number}>({ lat: 16.0470, lng: 108.2062 });

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

    // Lấy vị trí hiện tại của thiết bị
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDeviceLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        }
      );
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

  // Filter Map Markers to only show the closest upcoming event per location
  const getUniqueMapMarkers = (eventsWithLocation: Event[]) => {
    const locationMap = new Map<string, Event>();
    const now = new Date().getTime();

    eventsWithLocation.forEach(event => {
      const coordKey = `${event.latitude},${event.longitude}`;
      const eventTime = new Date(event.date).getTime();

      if (!locationMap.has(coordKey)) {
        locationMap.set(coordKey, event);
      } else {
        const existingEvent = locationMap.get(coordKey)!;
        const existingTime = new Date(existingEvent.date).getTime();

        const timeDiffNew = Math.abs(eventTime - now);
        const timeDiffExisting = Math.abs(existingTime - now);

        if (timeDiffNew < timeDiffExisting) {
          locationMap.set(coordKey, event);
        }
      }
    });

    return Array.from(locationMap.values());
  };

  const uniqueMapMarkers = getUniqueMapMarkers(upcomingEventsWithLocation);

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
            className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
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
                    className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
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
                          onClick={() => setViewingEvent(event)}
                        >
                          <div className="h-2 w-full transition-all duration-300 group-hover:h-3" style={{ backgroundColor: event.color || '#5865F2' }} />
                          <CardContent className="p-5">
                            <div className="flex items-start gap-4 mb-4">
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
                                
                                {/* 🌟 NHÚNG COMPONENT THỜI TIẾT VÀO CARD 🌟 */}
                                <WeatherBadge event={event} defaultLocation={deviceLocation} variant="card" />

                                {group && (
                                  <Badge variant="outline" className="rounded-full bg-white text-xs text-slate-500 border-slate-200 shadow-sm ml-auto">
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
          <div className="h-[650px] relative z-[0]">
            <MapContainer
              center={uniqueMapMarkers[0] 
                ? [uniqueMapMarkers[0].latitude!, uniqueMapMarkers[0].longitude!] 
                : [deviceLocation.lat, deviceLocation.lng]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {uniqueMapMarkers.map((event: Event) => (
                <Marker 
                  key={event.id} 
                  position={[event.latitude!, event.longitude!]}
                  icon={customMarkerIcon}
                >
                  <Tooltip 
                    direction="top" 
                    offset={[0, -40]} 
                    permanent 
                    className="bg-white/95 backdrop-blur-sm border-0 shadow-lg rounded-full px-3 py-1.5 text-xs font-semibold custom-tooltip"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: event.color || '#5865F2' }} />
                      <span className="text-slate-800">{format(new Date(event.date), 'MMM dd')}</span>
                      <span className="text-slate-400 font-normal truncate max-w-[120px]">{event.title}</span>
                    </div>
                  </Tooltip>

                  <Popup minWidth={280} className="rounded-2xl">
                    <div className="p-1">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="secondary" className="rounded-full text-[10px] uppercase px-2 py-0.5" style={{ color: event.color || '#5865F2', backgroundColor: `${event.color}15` }}>
                          {event.event_type || 'Event'}
                        </Badge>
                        
                        {/* 🌟 NHÚNG COMPONENT THỜI TIẾT VÀO POPUP BẢN ĐỒ 🌟 */}
                        <WeatherBadge event={event} defaultLocation={deviceLocation} variant="popup" />
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
                          e.stopPropagation();
                          setViewingEvent(event); 
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
                  className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white"
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
                  value={newEvent.end_time}
                  onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location Name</Label>
              <Input
                value={newEvent.location_name}
                onChange={(e) => setNewEvent({ ...newEvent, location_name: e.target.value })}
                placeholder="e.g., Central Park"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Select Location on Map (click to pin)</Label>
              <div className="h-64 rounded-xl overflow-hidden border">
                <MapContainer
                  center={mapPosition || [deviceLocation.lat, deviceLocation.lng]} 
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
                      setMapPosition(pos);
                      setNewEvent(prev => ({
                        ...prev,
                        latitude: pos.lat,
                        longitude: pos.lng,
                        location_address: 'Fetching address...' 
                      }));

                      try {
                        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.lat}&lon=${pos.lng}&accept-language=en`;
                        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        const data = await response.json();
                        
                        if (data && data.display_name) {
                          setNewEvent(prev => ({ ...prev, location_address: data.display_name }));
                        } else {
                          setNewEvent(prev => ({ ...prev, location_address: 'Address not found for this location' }));
                        }
                      } catch (error) {
                        console.error("Geocoding Error:", error);
                        setNewEvent(prev => ({ ...prev, location_address: 'Location pinned (Address fetch failed)' }));
                      }
                    }} 
                  />
                </MapContainer>
              </div>
              {mapPosition && (
                <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm relative group">
                  <div className="absolute top-2 right-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="peer w-7 h-7 text-slate-700 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      onClick={() => {
                        setMapPosition(null);
                        setNewEvent(prev => ({
                          ...prev,
                          latitude: undefined,
                          longitude: undefined,
                          location_address: ''
                        }));
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>

                    <span
                      className="
                        pointer-events-none
                        absolute right-full mr-2 top-1/2 -translate-y-1/2
                        opacity-0 translate-x-2
                        peer-hover:opacity-100 peer-hover:translate-x-0
                        transition-all duration-200 ease-out
                        bg-slate-900/90 backdrop-blur-md
                        text-white text-xs font-medium
                        px-3 py-1.5 rounded-xl
                        shadow-xl border border-slate-700
                        whitespace-nowrap
                      "
                    >
                      Remove selected location
                    </span>
                  </div>

                  <p className="text-slate-700 font-medium flex items-center gap-1 mb-1 pr-8">
                    <MapPin className="w-4 h-4 text-indigo-500" />
                    Specific Address
                  </p>

                  <p className="text-slate-600 line-clamp-2 pr-8" title={newEvent.location_address}>
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
                className="flex-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 shadow-md hover:shadow-lg transition-all"
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
              <div className="h-36 relative flex flex-col justify-end p-6" style={{ backgroundColor: viewingEvent.color || '#5865F2' }}>
                <div className="absolute top-4 bg-white/20 backdrop-blur-md px-3 py-1 mb-2 rounded-full text-white text-xs font-medium capitalize">
                  {viewingEvent.event_type}
                </div>
                <div className="absolute right-10 top-4 bg-white/20 backdrop-blur-md px-3 py-1 mb-2 rounded-full text-white text-xs font-medium capitalize">
                  {viewingEvent.group_id ? groups.find((g: any) => g.id === viewingEvent.group_id)?.name : 'No Group'}
                </div>
                <h2 className="text-2xl font-bold text-white drop-shadow-md">{viewingEvent.title}</h2>
                
                {/* 🌟 NHÚNG THỜI TIẾT ĐỘNG VÀO BANNER 🌟 */}
                <WeatherBadge event={viewingEvent} defaultLocation={deviceLocation} variant="detail" />
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
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Event
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Global CSS for Map Tooltip */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-tooltip {
          background-color: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(4px) !important;
          border: none !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
          border-radius: 9999px !important;
          padding: 6px 12px !important;
        }
        .custom-tooltip::before {
          border-top-color: rgba(255, 255, 255, 0.95) !important;
        }
      `}} />
    </div>
  );
} 