import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Calendar, Clock, MapPin, AlignLeft, Edit3, Trash2, 
  Users, CheckCircle, XCircle, HelpCircle, Repeat, Navigation 
} from "lucide-react";
import { format } from "date-fns";

interface EventDetailModalProps {
  event: any;
  groups: any[];
  onClose: () => void;
  onEdit: (event: any) => void;
  onDelete: (id: string) => void;
  onRSVP?: {
    userEmail: string;
    handler: (eventId: string, status: string) => void;
  };
}

export default function EventDetailModal({
  event,
  groups,
  onClose,
  onEdit,
  onDelete,
  onRSVP,
}: EventDetailModalProps) {
  if (!event) return null;

  const group = groups.find((g: any) => g.id === event.group_id);

  // Helper to format initials for Avatars
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl bg-white">
        
        <DialogTitle className="sr-only">Event Details: {event.title}</DialogTitle>
        <DialogDescription className="sr-only">Detailed view of the selected event</DialogDescription>

        {/* Dynamic Ticket Header */}
        <div 
          className="relative px-6 pt-8 pb-10 flex flex-col justify-end"
          style={{ backgroundColor: event.color || '#5865F2' }}
        >
          {/* Decorative Pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <Badge className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-0 capitalize">
                {event.event_type || 'Event'}
              </Badge>
              {group && (
                <Badge variant="outline" className="bg-black/20 text-white border-white/20 backdrop-blur-sm">
                  {group.name}
                </Badge>
              )}
            </div>
            <h2 className="text-3xl font-black text-white leading-tight drop-shadow-sm mb-2">
              {event.title}
            </h2>
            {event.is_recurring && (
              <div className="flex items-center text-white/80 text-sm font-medium bg-black/10 w-max px-2.5 py-1 rounded-full">
                <Repeat className="w-3.5 h-3.5 mr-1.5" />
                Repeats {event.recurrence_pattern}
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="px-6 py-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          
          {/* Time & Date Block */}
          <div className="flex bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex-1 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Date</p>
                <p className="font-semibold text-slate-800">{format(new Date(event.date), 'EEEE, MMM d, yyyy')}</p>
              </div>
            </div>
            
            <div className="w-px bg-slate-200 mx-4" />
            
            <div className="flex-1 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Time</p>
                <p className="font-semibold text-slate-800">
                  {event.start_time ? `${event.start_time} ${event.end_time ? `- ${event.end_time}` : ''}` : 'All Day'}
                </p>
              </div>
            </div>
          </div>

          {/* Location Block */}
          {(event.location_name || event.location_address) && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shrink-0 mt-1">
                <Navigation className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Destination</p>
                <p className="text-base font-semibold text-slate-800">{event.location_name || 'Pinned Location'}</p>
                {event.location_address && (
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {event.location_address}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Description Block */}
          {event.description && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-1">
                <AlignLeft className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Details</p>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            </div>
          )}

          {/* RSVP Section */}
          {event.rsvp_enabled && (
            <>
              <Separator className="bg-slate-100" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4" /> Guest List
                  </p>
                  <Badge variant="secondary" className="rounded-full bg-slate-100">
                    {Object.keys(event.rsvp_responses || {}).length} Responded
                  </Badge>
                </div>

                {/* List of responses */}
                {Object.keys(event.rsvp_responses || {}).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    {Object.entries(event.rsvp_responses).map(([email, status]) => {
                      const memberName = group?.member_names?.[email] || email.split('@')[0];
                      return (
                        <div key={email} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-slate-200 text-slate-600 text-xs">
                              {getInitials(memberName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{memberName}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5 flex items-center gap-1">
                              {status === 'yes' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                              {status === 'no' && <XCircle className="w-3 h-3 text-red-500" />}
                              {status === 'maybe' && <HelpCircle className="w-3 h-3 text-amber-500" />}
                              <span className={
                                status === 'yes' ? 'text-emerald-600' : 
                                status === 'no' ? 'text-red-600' : 'text-amber-600'
                              }>
                                {status as string}
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic mb-5">No responses yet.</p>
                )}

                {/* My RSVP Action */}
                {onRSVP && (
                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                    <p className="text-sm font-semibold text-indigo-900 mb-3 text-center">Are you going?</p>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => onRSVP.handler(event.id, 'yes')}
                        className={`flex-1 rounded-full ${event.rsvp_responses?.[onRSVP.userEmail] === 'yes' ? 'bg-emerald-500 hover:bg-emerald-600 text-white ring-2 ring-emerald-200 ring-offset-1' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Yes
                      </Button>
                      <Button 
                        onClick={() => onRSVP.handler(event.id, 'maybe')}
                        className={`flex-1 rounded-full ${event.rsvp_responses?.[onRSVP.userEmail] === 'maybe' ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-200 ring-offset-1' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                      >
                        <HelpCircle className="w-4 h-4 mr-1.5" /> Maybe
                      </Button>
                      <Button 
                        onClick={() => onRSVP.handler(event.id, 'no')}
                        className={`flex-1 rounded-full ${event.rsvp_responses?.[onRSVP.userEmail] === 'no' ? 'bg-rose-500 hover:bg-rose-600 text-white ring-2 ring-rose-200 ring-offset-1' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
                      >
                        <XCircle className="w-4 h-4 mr-1.5" /> No
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => onDelete(event.id)}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full px-4"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="rounded-full">
              Close
            </Button>
            <Button 
              onClick={() => onEdit(event)}
              className="rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-md"
            >
              <Edit3 className="w-4 h-4 mr-2" /> Edit Event
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}