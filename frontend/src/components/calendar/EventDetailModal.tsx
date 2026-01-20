import { 
  MapPin, Calendar, Edit2, Trash2, Repeat, Bell, Users,
  CheckCircle, XCircle, HelpCircle, CloudRain, Navigation
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';

interface EventDetailModalProps {
  event: any | null;
  groups: any[];
  onClose: () => void;
  onEdit: (event: any) => void;
  onDelete: (eventId: string) => void;
  onRSVP?: { userEmail: string; handler: (eventId: string, status: string) => void };
}

export default function EventDetailModal({ event, groups, onClose, onEdit, onDelete, onRSVP }: EventDetailModalProps) {
  if (!event) return null;

  const group = groups.find((g: any) => g.id === event.group_id);

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{event.title}</DialogTitle>
              {group && (
                <Badge variant="secondary" className="rounded-full">
                  {group.name}
                </Badge>
              )}
            </div>
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0 mt-2"
              style={{ backgroundColor: event.color || '#5865F2' }}
            />
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date & Time */}
          <div className="flex items-center gap-3 text-slate-700">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <div>
              <p className="font-medium">{format(new Date(event.date), 'EEEE, MMMM d, yyyy')}</p>
              {event.start_time && (
                <p className="text-sm text-slate-500">
                  {event.start_time} {event.end_time && `- ${event.end_time}`}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location_name && (
            <>
              <div className="flex items-center gap-3 text-slate-700">
                <MapPin className="w-5 h-5 text-indigo-500" />
                <div className="flex-1">
                  <p className="font-medium">{event.location_name}</p>
                  {event.location_address && (
                    <p className="text-sm text-slate-500">{event.location_address}</p>
                  )}
                  {event.latitude && event.longitude && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Map */}
              {event.latitude && event.longitude && (
                <div className="rounded-2xl overflow-hidden border-2 border-slate-200 h-64">
                  <MapContainer
                    center={[event.latitude, event.longitude]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker position={[event.latitude, event.longitude]}>
                      <Popup>
                        <div className="text-center">
                          <p className="font-semibold">{event.location_name}</p>
                          {event.location_address && (
                            <p className="text-xs text-slate-500">{event.location_address}</p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              )}
            </>
          )}

          {/* Event Type */}
          {event.event_type && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full capitalize">
                {event.event_type}
              </Badge>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Description</p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{event.description}</p>
              </div>
            </>
          )}

          {/* Weather */}
          {event.weather && (
            <>
              <Separator />
              <div className="flex items-center gap-3 text-slate-700">
                <CloudRain className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className="font-medium">Weather Forecast</p>
                  <p className="text-sm text-slate-500">
                    {event.weather.condition} • {event.weather.temp}°C
                    {event.weather.description && ` • ${event.weather.description}`}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  <p className="font-medium text-slate-700">Attendees ({event.attendees.length})</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.attendees.map((email: string) => {
                    const memberName = group?.member_names?.[email] || email;
                    return (
                      <Badge key={email} variant="secondary" className="rounded-full">
                        {memberName}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Recurring */}
          {event.is_recurring && (
            <>
              <Separator />
              <div className="flex items-center gap-3 text-slate-700">
                <Repeat className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className="font-medium">Recurring Event</p>
                  <p className="text-sm text-slate-500 capitalize">
                    Repeats {event.recurrence_pattern}
                    {event.recurrence_end_date && ` until ${format(new Date(event.recurrence_end_date), 'MMM d, yyyy')}`}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Reminder */}
          {event.reminder_minutes > 0 && (
            <>
              <Separator />
              <div className="flex items-center gap-3 text-slate-700">
                <Bell className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className="font-medium">Reminder</p>
                  <p className="text-sm text-slate-500">
                    {event.reminder_minutes < 60 
                      ? `${event.reminder_minutes} minutes before`
                      : event.reminder_minutes < 1440
                        ? `${Math.floor(event.reminder_minutes / 60)} hour${Math.floor(event.reminder_minutes / 60) > 1 ? 's' : ''} before`
                        : `${Math.floor(event.reminder_minutes / 1440)} day${Math.floor(event.reminder_minutes / 1440) > 1 ? 's' : ''} before`
                    }
                  </p>
                </div>
              </div>
            </>
          )}

          {/* RSVPs */}
          {event.rsvp_enabled && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-indigo-500" />
                  <p className="font-medium text-slate-700">RSVPs</p>
                </div>
                {Object.entries(event.rsvp_responses || {}).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(event.rsvp_responses || {}).map(([email, status]) => {
                      const memberName = group?.member_names?.[email] || email;
                      return (
                        <div key={email} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">{memberName}</span>
                          <Badge className={
                            status === 'yes' ? 'bg-emerald-100 text-emerald-700' :
                            status === 'no' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }>
                            {(status as string) === 'yes' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {(status as string) === 'no' && <XCircle className="w-3 h-3 mr-1" />}
                            {(status as string) === 'maybe' && <HelpCircle className="w-3 h-3 mr-1" />}
                            {status as string}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No responses yet</p>
                )}
                
                {onRSVP && !event.rsvp_responses?.[onRSVP.userEmail] && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => onRSVP.handler(event.id, 'yes')} className="flex-1 rounded-full">
                      <CheckCircle className="w-3 h-3 mr-1" /> Yes
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onRSVP.handler(event.id, 'maybe')} className="flex-1 rounded-full">
                      <HelpCircle className="w-3 h-3 mr-1" /> Maybe
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onRSVP.handler(event.id, 'no')} className="flex-1 rounded-full">
                      <XCircle className="w-3 h-3 mr-1" /> No
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <Separator />
        <div className="flex gap-2 pt-2">
          <Button 
            variant="destructive" 
            onClick={() => {
              onDelete(event.id);
              onClose();
            }}
            className="rounded-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button 
            onClick={() => {
              onEdit(event);
              onClose();
            }}
            className="flex-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Event
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}