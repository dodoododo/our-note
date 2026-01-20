import { Plus, Clock, MapPin, Repeat, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';

interface DateEventsModalProps {
  date: Date | null;
  events?: any[];
  onClose: () => void;
  onEventClick: (event: any) => void;
  onAddEvent: () => void;
}

export default function DateEventsModal({ date, events = [], onClose, onEventClick, onAddEvent }: DateEventsModalProps) {
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.start_time && !b.start_time) return 0;
    if (!a.start_time) return 1;
    if (!b.start_time) return -1;
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <Dialog open={!!date} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {date && format(date, 'EEEE, MMMM d, yyyy')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-[60vh] overflow-y-auto py-4">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">No events on this day</p>
              <Button 
                onClick={onAddEvent}
                className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Event
              </Button>
            </div>
          ) : (
            <>
              {sortedEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border-l-4"
                  style={{ borderLeftColor: event.color || '#5865F2' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-800">{event.title}</h3>
                    {event.start_time && (
                      <Badge variant="secondary" className="rounded-full text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {event.start_time}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm text-slate-600">
                    {event.description && (
                      <p className="line-clamp-2">{event.description}</p>
                    )}
                    {event.location_name && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {event.location_name}
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {event.is_recurring && (
                        <Badge variant="outline" className="rounded-full text-xs">
                          <Repeat className="w-3 h-3 mr-1" />
                          Recurring
                        </Badge>
                      )}
                      {event.rsvp_enabled && (
                        <Badge variant="outline" className="rounded-full text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          {Object.values(event.rsvp_responses || {}).filter(r => r === 'yes').length} attending
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              <Button 
                onClick={onAddEvent}
                variant="outline"
                className="w-full rounded-full mt-4"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Another Event
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}