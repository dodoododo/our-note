import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Clock, MapPin, CalendarHeart, Ghost,
  Cloud, Sun, CloudRain, Snowflake, CloudLightning, Wind
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from '@tanstack/react-query';

// --- WEATHER HELPER FUNCTIONS ---
const getWeatherConfig = (condition: string) => {
  const lowercaseCondition = condition.toLowerCase();
  if (lowercaseCondition.includes('clear') || lowercaseCondition.includes('sun')) 
    return { icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' };
  if (lowercaseCondition.includes('rain') || lowercaseCondition.includes('drizzle')) 
    return { icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' };
  if (lowercaseCondition.includes('thunderstorm') || lowercaseCondition.includes('lightning')) 
    return { icon: CloudLightning, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' };
  if (lowercaseCondition.includes('snow')) 
    return { icon: Snowflake, color: 'text-sky-400', bg: 'bg-sky-50', border: 'border-sky-100' };
  if (lowercaseCondition.includes('wind')) 
    return { icon: Wind, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-100' };
  
  return { icon: Cloud, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' }; // Default
};

function useEventWeather(event: any, defaultLocation: {lat: number, lng: number}) {
  const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
  
  return useQuery({
    queryKey: ['event-weather', event?.id, event?.latitude, event?.longitude, event?.date, event?.start_time],
    queryFn: async () => {
      if (!OPENWEATHER_API_KEY || !event) return null;
      
      const targetLat = event.latitude || defaultLocation.lat;
      const targetLng = event.longitude || defaultLocation.lng;
      
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${targetLat}&lon=${targetLng}&units=metric&appid=${OPENWEATHER_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const data = await response.json();
      
      const eventDateStr = event.date.split('T')[0];
      const targetTime = event.start_time ? `${event.start_time}:00` : '12:00:00';
      const targetDateTimeStr = `${eventDateStr} ${targetTime}`;
      
      let bestMatch = data.list.find((item: any) => item.dt_txt === targetDateTimeStr);
      if (!bestMatch) {
        bestMatch = data.list.find((item: any) => item.dt_txt.startsWith(eventDateStr));
      }

      if (bestMatch) {
        return {
          temp: Math.round(bestMatch.main.temp),
          condition: bestMatch.weather[0].main
        };
      }
      return null;
    },
    enabled: !!OPENWEATHER_API_KEY && !!event,
    staleTime: 1000 * 60 * 30, // 30 minutes cache
  });
}
// --------------------------------

interface DateEventsModalProps {
  date: Date | null;
  events: any[];
  onClose: () => void;
  onEventClick: (event: any) => void;
  onAddEvent: () => void;
  defaultLocation?: {lat: number, lng: number};
}

// Sub-component to render each Event item (required to use hooks inside a list)
function EventListItem({ event, index, onClick, defaultLocation }: { event: any, index: number, onClick: () => void, defaultLocation: {lat: number, lng: number} }) {
  const { data: eventWeather } = useEventWeather(event, defaultLocation);
  const weatherConfig = eventWeather ? getWeatherConfig(eventWeather.condition) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="group relative bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-slate-100/50 overflow-hidden flex justify-between items-center"
    >
      {/* Left color bar indicator */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2"
        style={{ backgroundColor: event.color || '#5865F2' }}
      />
      
      <div className="pl-2 flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="secondary" className="text-[10px] uppercase font-bold px-2 py-0.5" style={{ color: event.color || '#5865F2', backgroundColor: `${event.color}15` }}>
            {event.event_type || 'Event'}
          </Badge>
          {event.is_recurring && (
            <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200">
              Recurring
            </Badge>
          )}
        </div>
        
        <h4 className="font-bold text-slate-800 text-lg mb-2 truncate group-hover:text-indigo-600 transition-colors">
          {event.title}
        </h4>
        
        <div className="space-y-1.5">
          <div className="flex items-center text-sm text-slate-500 font-medium">
            <Clock className="w-4 h-4 mr-2 text-slate-400" />
            {event.start_time ? `${event.start_time} ${event.end_time ? `- ${event.end_time}` : ''}` : 'All Day Event'}
          </div>      
          {event.location_name && (
            <div className="flex items-start text-sm text-slate-500">
              <MapPin className="w-4 h-4 mr-2 text-rose-400 mt-0.5 shrink-0" />
              <span className="truncate">{event.location_name}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {event.location_address && (
              <p className="text-sm text-slate-500 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {event.location_address}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Right Side: Weather Box OR Default Icon */}
      <div className="shrink-0 pl-2">
        {eventWeather && weatherConfig ? (
          <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl ${weatherConfig.bg} border ${weatherConfig.border} shadow-sm group-hover:scale-105 transition-transform`} title={eventWeather.condition}>
            <weatherConfig.icon className={`w-5 h-5 ${weatherConfig.color}`} />
            <span className={`text-xs font-bold mt-1 ${weatherConfig.color}`}>{eventWeather.temp}°C</span>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
            <CalendarHeart className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function DateEventsModal({
  date,
  events,
  onClose,
  onEventClick,
  onAddEvent,
  defaultLocation = { lat: 16.0470, lng: 108.2062 } // Fallback to Da Nang
}: DateEventsModalProps) {
  if (!date) return null;

  // Sort events by time
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.start_time) return -1;
    if (!b.start_time) return 1;
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <Dialog open={!!date} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden border-0 shadow-2xl bg-slate-50/95 backdrop-blur-xl">
        {/* Dynamic Header */}
        <div className="relative h-32 bg-red-500 p-6 flex flex-col justify-end overflow-hidden">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 text-white flex justify-between items-end">
            <div>
              <p className="text-sm font-medium opacity-80 uppercase tracking-wider mb-1">
                {format(date, "EEEE")}
              </p>
              <h2 className="text-3xl font-black drop-shadow-md">
                {format(date, "MMMM d, yyyy")}
              </h2>
            </div>
            <div className="text-right">
              <Badge className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border-0">
                {events.length} {events.length === 1 ? 'Event' : 'Events'}
              </Badge>
            </div>
          </div>
        </div>

        <DialogHeader className="sr-only">
          <DialogTitle>Events for {format(date, "MMM d, yyyy")}</DialogTitle>
          <DialogDescription>List of events scheduled for the selected date.</DialogDescription>
        </DialogHeader>

        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {sortedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <Ghost className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">It's quiet here...</p>
              <p className="text-sm text-slate-400 mb-6">No events scheduled for this day.</p>
              <Button 
                onClick={onAddEvent}
                className="rounded-full bg-slate-900 text-white shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="w-4 h-4 mr-2" /> Plan Something
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {sortedEvents.map((event, index) => (
                  <EventListItem 
                    key={event.id}
                    event={event}
                    index={index}
                    onClick={() => onEventClick(event)}
                    defaultLocation={defaultLocation}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer Action */}
        {sortedEvents.length > 0 && (
          <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} className="rounded-full">Cancel</Button>
            <Button onClick={onAddEvent} className="rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-md">
              <Plus className="w-4 h-4 mr-2" /> Add New Event
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}