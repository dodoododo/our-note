import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, MapPin, CalendarHeart, Ghost } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface DateEventsModalProps {
  date: Date | null;
  events: any[];
  onClose: () => void;
  onEventClick: (event: any) => void;
  onAddEvent: () => void;
}

export default function DateEventsModal({
  date,
  events,
  onClose,
  onEventClick,
  onAddEvent,
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
      <DialogContent className="m:max-w-md rounded-3xl p-0 overflow-hidden border-0 shadow-2xl bg-slate-50/95 backdrop-blur-xl">
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
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onEventClick(event)}
                    className="group relative bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-slate-100/50 overflow-hidden"
                  >
                    {/* Left color bar indicator */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2"
                      style={{ backgroundColor: event.color || '#5865F2' }}
                    />
                    
                    <div className="pl-2 flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-4">
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
                        </div>
                      </div>
                      
                      {/* Decorative icon based on event type */}
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
                        <CalendarHeart className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
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