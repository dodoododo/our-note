import { mockApiClient } from '@/lib/mockApiClient';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';

export default function PresenceIndicator({ group }: { group: any }) {
  const { data: presences = [] } = useQuery({
    queryKey: ['groupPresence', group.id],
    queryFn: async () => {
      const all = await mockApiClient.entities.Presence.list().then(p => p.filter(pr => pr.group_id === group.id));
      const thirtySecondsAgo = new Date(Date.now() - 30000);
      return all.filter(p => new Date(p.last_activity || p.updated_date) > thirtySecondsAgo);
    },
    refetchInterval: 5000,
  });

  const getInitials = (name: string): string => {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (presences.length === 0) return null;

  return (
    <Card className="border-0 shadow-xl bg-emerald-50/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <p className="text-sm font-medium text-emerald-700">
            {presences.length} member{presences.length > 1 ? 's' : ''} online now
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {presences.map((presence) => (
            <motion.div
              key={presence.user_email}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 bg-white rounded-full px-3 py-1.5 border border-emerald-200"
            >
              <Avatar className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-500">
                <AvatarFallback className="bg-transparent text-white text-xs">
                  {getInitials(presence.user_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-700">{presence.user_name}</span>
                {presence.page && (
                  <span className="text-xs text-slate-500 capitalize">{presence.page}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}