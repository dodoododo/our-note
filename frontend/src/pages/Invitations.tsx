import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Check, X, Clock, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import { format } from 'date-fns';

// ✅ Import Real APIs
import { userApi } from "@/api/user.api";
import { groupApi } from "@/api/group.api";
import { invitationApi } from "@/api/invitation.api";
import type { Invitation } from "@/types/invitation";
import type { User } from "@/types/user";

export default function Invitations() {
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async (): Promise<void> => {
    try {
      const userData: any = await userApi.getMe();
      setUser(userData);
    } catch (e) {
      console.error("Failed to load user", e);
    }
  };

  // ✅ Fetch all invitations from Real API
  const { data: allInvitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ['invitations', user?.email],
    queryFn: async () => {
      const data = await invitationApi.listMyInvitations();
      // Ensure we only show invitations meant for this user
      return data.filter((i: Invitation) => i.invitee_email === user?.email);
    },
    enabled: !!user?.email,
  });

  // Filter pending vs past directly from the single query
  const pendingInvitations = allInvitations.filter((i: Invitation) => i.status === 'pending');
  const pastInvitations = allInvitations.filter((i: Invitation) => i.status !== 'pending');

  const acceptMutation = useMutation({
    mutationFn: async (invitation: Invitation): Promise<void> => {
      // Chỉ gọi ĐÚNG 1 API này. Backend sẽ tự động lo việc add user vào Group.
      await invitationApi.updateStatus(invitation.id, { status: 'accepted' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Invitation accepted! You are now a member of the group.');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to accept invitation.';
      toast.error(errorMessage);
    }
  });

  const declineMutation = useMutation({
    mutationFn: async (invitation: Invitation): Promise<void> => {
      // ✅ Use real API to update status
      await invitationApi.updateStatus(invitation.id, { status: 'declined' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation declined');
    },
    onError: () => {
      toast.error('Failed to decline invitation');
    }
  });

  const getInitials = (name: string): string => {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Invitations</h1>
        <p className="text-slate-500 mt-1">Manage your group invitations</p>
      </div>

      {/* Pending Invitations */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-500" />
            Pending Invitations
            {pendingInvitations.length > 0 && (
              <Badge className="bg-indigo-500 rounded-full">{pendingInvitations.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invitationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pendingInvitations.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No pending invitations</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-4">
                {pendingInvitations.map((invitation: Invitation) => (
                  <motion.div
                    key={invitation.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100"
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500">
                        <AvatarFallback className="bg-transparent text-white">
                          {getInitials(invitation.inviter_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">
                          {invitation.inviter_name || invitation.inviter_email}
                        </p>
                        <p className="text-sm text-slate-600">
                          invited you to join <span className="font-medium">{invitation.group_name}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          {invitation.created_at ? format(new Date(invitation.created_at), 'MMM d, yyyy') : 'Recently'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => declineMutation.mutate(invitation)}
                          disabled={declineMutation.isPending || acceptMutation.isPending}
                          variant="outline"
                          size="icon"
                          className="rounded-full border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => acceptMutation.mutate(invitation)}
                          disabled={acceptMutation.isPending || declineMutation.isPending}
                          size="icon"
                          className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Past Invitations */}
      {pastInvitations.length > 0 && (
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              Past Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastInvitations.map((invitation: Invitation) => (
                <div key={invitation.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50">
                  <Avatar className="w-10 h-10 bg-slate-200">
                    <AvatarFallback className="bg-transparent text-slate-600 text-sm">
                      {getInitials(invitation.inviter_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">
                      <span className="font-medium">{invitation.group_name}</span> from {invitation.inviter_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {invitation.updated_at ? format(new Date(invitation.updated_at), 'MMM d, yyyy') : ''}
                    </p>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`rounded-full ${
                      invitation.status === 'accepted' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {invitation.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}