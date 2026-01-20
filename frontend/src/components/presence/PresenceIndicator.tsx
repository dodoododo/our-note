import { useEffect } from 'react';
import { mockApiClient } from '@/lib/mockApiClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PresenceIndicator({ groupId, page, user }: { groupId: string; page?: string; user: any }) {
  const { data: presences = [] } = useQuery({
    queryKey: ['presence', groupId, page],
    queryFn: async () => {
      const all = await mockApiClient.entities.Presence.list();
      // Filter by group
      const filtered = all.filter(p => p.group_id === groupId);
      // Filter out old presences (more than 30 seconds old)
      const thirtySecondsAgo = new Date(Date.now() - 30000);
      return filtered.filter(p => 
        new Date(p.last_activity || p.updated_date) > thirtySecondsAgo &&
        (page ? p.page === page : true)
      );
    },
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const updatePresenceMutation = useMutation({
    mutationFn: async () => {
      const existing = await mockApiClient.entities.Presence.filter({
        user_email: user.email,
        group_id: groupId
      });

      if (existing.length > 0) {
        await mockApiClient.entities.Presence.update(existing[0].id, {
          page,
          status: 'online',
          last_activity: new Date().toISOString()
        });
      } else {
        await mockApiClient.entities.Presence.create({
          user_email: user.email,
          user_name: user.full_name,
          group_id: groupId,
          page,
          status: 'online',
          last_activity: new Date().toISOString()
        });
      }
    },
  });

  // Update presence on mount and periodically
  useEffect(() => {
    if (!user || !groupId) return;

    updatePresenceMutation.mutate();
    const interval = setInterval(() => {
      updatePresenceMutation.mutate();
    }, 10000); // Update every 10 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      // Mark as away
      mockApiClient.entities.Presence.filter({
        user_email: user.email,
        group_id: groupId
      }).then(existing => {
        if (existing.length > 0) {
          mockApiClient.entities.Presence.delete(existing[0].id);
        }
      });
    };
  }, [user, groupId, page]);

  const getInitials = (name: string): string => {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const activeUsers = presences.filter(p => p.user_email !== user?.email);

  if (activeUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-emerald-500" />
        <span className="text-sm text-slate-600 font-medium">{activeUsers.length} online</span>
      </div>
      <div className="flex -space-x-2">
        <AnimatePresence>
          {activeUsers.slice(0, 5).map((presence) => (
            <motion.div
              key={presence.user_email}
              initial={{ scale: 0, x: -10 }}
              animate={{ scale: 1, x: 0 }}
              exit={{ scale: 0, x: -10 }}
              className="relative"
            >
              <Avatar className="w-8 h-8 border-2 border-white bg-gradient-to-br from-emerald-400 to-teal-500">
                <AvatarFallback className="bg-transparent text-white text-xs">
                  {getInitials(presence.user_name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
            </motion.div>
          ))}
        </AnimatePresence>
        {activeUsers.length > 5 && (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 border-2 border-white text-xs font-semibold text-slate-600">
            +{activeUsers.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}