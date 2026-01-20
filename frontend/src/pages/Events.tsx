import { useState, useEffect } from 'react';
import { mockApiClient } from '@/lib/mockApiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
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

// Fix Leaflet default icon
(L.Icon.Default.prototype as any)._getIconUrl = undefined;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
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

function LocationMarker({ position, setPosition }: { position: any; setPosition: (pos: any) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? (
    <Marker position={position}>
      <Popup>Selected location</Popup>
    </Marker>
  ) : null;
}

export default function Events() {
  const [user, setUser] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<string>('list');
  const [eventModalOpen, setEventModalOpen] = useState<boolean>(false);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [mapPosition, setMapPosition] = useState<any>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    group_id: '',
    date: '',
    start_time: '',
    end_time: '',
    location_name: '',
    location_address: '',
    latitude: null,
    longitude: null,
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
      const groupIds = selectedGroup === 'all' ? groups.map(g => g.id) : [selectedGroup];
      const allEvents = await mockApiClient.entities.Event.list();
      return allEvents.filter(e => groupIds.includes(e.group_id));
    },
    enabled: groups.length > 0,
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any): Promise<any> => {
      if (editingEvent) {
        return await mockApiClient.entities.Event.update(editingEvent.id, eventData);
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

  const deleteEventMutation = useMutation({
    mutationFn: (id: string): Promise<void> => mockApiClient.entities.Event.delete(id),
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
      latitude: null,
      longitude: null,
      event_type: 'other',
      color: '#5865F2'
    });
    setMapPosition(null);
  };

  const openEditEvent = (event: any): void => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      description: event.description || '',
      group_id: event.group_id,
      date: event.date,
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

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.location_name && event.location_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const upcomingEvents = filteredEvents
    .filter(e => !isPast(new Date(e.date)) || isToday(new Date(e.date)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastEvents = filteredEvents
    .filter(e => isPast(new Date(e.date)) && !isToday(new Date(e.date)))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const eventsWithLocation: any[] = events.filter(e => e.latitude && e.longitude);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Events</h1>
          <p className="text-slate-500 mt-1">Plan activities with maps & AI suggestions</p>
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
            onClick={() => setAiModalOpen(true)}
            variant="outline"
            className="rounded-full border-purple-200 text-purple-600 hover:bg-purple-50"
          >
            <Sparkles className="w-4 h-4 mr-2" /> AI Suggest
          </Button>
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
        <Tabs value={viewMode} onValueChange={setViewMode}>
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
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {upcomingEvents.map((event) => {
                    const group = groups.find(g => g.id === event.group_id);
                    const weather = getRandomWeather(event.date);
                    const WeatherIcon = weather.icon;
                    return (
                      <motion.div
                        key={event.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <Card 
                          className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden"
                          onClick={() => openEditEvent(event)}
                        >
                          <div className="h-2" style={{ backgroundColor: event.color || '#5865F2' }} />
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div 
                                className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg"
                                style={{ backgroundColor: event.color || '#5865F2' }}
                              >
                                <span className="text-xs opacity-80">{format(new Date(event.date), 'MMM')}</span>
                                <span className="text-xl font-bold leading-none">{format(new Date(event.date), 'd')}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <WeatherIcon className={`w-5 h-5 ${weather.color}`} />
                                <span className="text-sm text-slate-500">{weather.temp}</span>
                              </div>
                            </div>
                            <h3 className="font-semibold text-lg text-slate-800 mb-2">{event.title}</h3>
                            <div className="space-y-2 text-sm text-slate-500">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{getEventDate(event.date)}</span>
                                {event.start_time && <span>• {event.start_time}</span>}
                              </div>
                              {event.location_name && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span className="truncate">{event.location_name}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-4">
                              <Badge variant="secondary" className="rounded-full capitalize">
                                {event.event_type}
                              </Badge>
                              {group && (
                                <Badge variant="outline" className="rounded-full">
                                  {group.name}
                                </Badge>
                              )}
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
                {pastEvents.slice(0, 6).map((event) => {
                  const _group = groups.find(g => g.id === event.group_id);
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
        /* Map View */
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="h-[600px]">
            <MapContainer
              center={eventsWithLocation[0] ? [eventsWithLocation[0].latitude, eventsWithLocation[0].longitude] : [40.7128, -74.006]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {eventsWithLocation.map((event) => (
                <Marker 
                  key={event.id} 
                  position={[event.latitude, event.longitude]}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold">{event.title}</h3>
                      <p className="text-sm text-slate-500">{format(new Date(event.date), 'MMM d, yyyy')}</p>
                      {event.location_name && (
                        <p className="text-sm">{event.location_name}</p>
                      )}
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
                  center={mapPosition || [40.7128, -74.006]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker 
                    position={mapPosition} 
                    setPosition={(pos) => {
                      setMapPosition(pos);
                      setNewEvent(prev => ({
                        ...prev,
                        latitude: pos.lat,
                        longitude: pos.lng
                      }));
                    }} 
                  />
                </MapContainer>
              </div>
              {mapPosition && (
                <p className="text-xs text-slate-500">
                  📍 {mapPosition.lat.toFixed(4)}, {mapPosition.lng.toFixed(4)}
                </p>
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
                value={newEvent.description}
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
    </div>
  );
}