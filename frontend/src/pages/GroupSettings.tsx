import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Settings, UserPlus, Calendar, Trash2, 
  Save, Mail, X, Heart, Shield, Bell, Lock, Crown, RefreshCw, Camera
} from 'lucide-react';
import RoleManager from '../components/groups/RoleManager.tsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from 'date-fns';

// ✅ Import Real APIs
import { userApi } from "@/api/user.api";
import { groupApi } from "@/api/group.api";
import { invitationApi } from "@/api/invitation.api";

export default function GroupSettings() {
  const [user, setUser] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlParams = new URLSearchParams(window.location.search);
  const groupId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async (): Promise<void> => {
    try {
      const userData = await userApi.getMe();
      setUser(userData);
    } catch (e) {
      // Handle error
    }
  };

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => {
        if(!groupId) return null;
        return groupApi.get(groupId);
    },
    enabled: !!groupId,
  });

  const [editedGroup, setEditedGroup] = useState<any>(null);

  useEffect(() => {
    if (group) {
      setEditedGroup({
        name: group.name,
        description: group.description || '',
        couple_start_date: group.couple_start_date || '',
        notifications_enabled: group.notifications_enabled !== false,
        notify_on_task_assignment: group.notify_on_task_assignment !== false,
        notify_on_event_changes: group.notify_on_event_changes !== false,
        notify_on_new_notes: group.notify_on_new_notes || false,
        is_private: group.is_private !== false,
        allow_member_invites: group.allow_member_invites || false,
      });
    }
  }, [group]);

  const updateGroupMutation = useMutation({
    mutationFn: async (data: any): Promise<void> => {
      if (!groupId) return;
      // ✅ Use Real Group API
      await groupApi.update(groupId, data);
    },
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast.success('Group updated successfully!');
    },
    onError: () => {
        toast.error('Failed to update group');
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!groupId) return;
      // ✅ Use Real Group API
      await groupApi.delete(groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      navigate(createPageUrl('Groups'));
      toast.success('Group deleted');
    },
    onError: () => {
        toast.error('Failed to delete group');
    }
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string): Promise<void> => {
      if (!groupId || !user) return;
      
      // Check if already a member
      if (group?.members?.includes(email)) {
        throw new Error('User is already a member of this group');
      }
      
      // For couples, check max 2 members
      if (group?.type === 'couple' && group?.members?.length && group.members.length >= 2) {
        throw new Error('Couple groups can only have a maximum of 2 members');
      }

      // ✅ Use Real Invitation API
      await invitationApi.create({
        group_id: groupId,
        group_name: group?.name || '',
        invitee_email: email,
        // Optional: Send these if your backend doesn't auto-detect them from the token
        // inviter_email: user.email, 
        // inviter_name: user.full_name,
      });
    },
    onSuccess: () => {
      setInviteEmail('');
      toast.success(`Invitation sent successfully to ${inviteEmail}`);
    },
    onError: (error: any) => {
      // Improved error display
      toast.error(error?.response?.data?.message || error.message || 'Failed to send invite');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (email: string): Promise<void> => {
      if (!groupId) return;
      // Calculate new state locally and send via PATCH
      const newMembers = group?.members?.filter((m: string) => m !== email) || [];
      const newMemberNames = { ...(group?.member_names || {}) };
      delete newMemberNames[email];
      const newMemberRoles = { ...(group?.member_roles || {}) };
      delete newMemberRoles[email];
      
      // ✅ Use Real Group API
      await groupApi.update(groupId, {
        members: newMembers,
        member_names: newMemberNames,
        member_roles: newMemberRoles
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast.success('Member removed');
    },
    onError: () => {
        toast.error('Failed to remove member');
    }
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }): Promise<void> => {
      if (!groupId) return;
      const newMemberRoles = { ...(group?.member_roles || {}), [email]: role };
      // ✅ Use Real Group API
      await groupApi.update(groupId, {
        member_roles: newMemberRoles
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast.success('Role updated');
    },
    onError: () => {
        toast.error('Failed to update role');
    }
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: async (newOwnerEmail: string): Promise<void> => {
      if (!groupId) return;
      // Ensure new owner is an admin
      const newMemberRoles = { ...(group?.member_roles || {}), [newOwnerEmail]: 'admin' };
      // ✅ Use Real Group API
      await groupApi.update(groupId, {
        owner: newOwnerEmail,
        member_roles: newMemberRoles
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      setShowTransferDialog(false);
      setTransferEmail('');
      toast.success('Ownership transferred successfully!');
    },
    onError: () => {
        toast.error('Failed to transfer ownership');
    }
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      // ✅ Use Real Upload API
      const { file_url } = await groupApi.uploadFile(file);
      await updateGroupMutation.mutateAsync({ avatar_url: file_url });
      toast.success('Avatar updated!');
    } catch (error) {
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getInitials = (name: string): string => {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading || !group || !editedGroup) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOwner = group.owner === user?.email;
  const isAdmin = group.member_roles?.[user?.email] === 'admin' || isOwner;
  const canManageMembers = isOwner || (isAdmin && group.allow_member_invites);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`${createPageUrl('GroupDetail')}?id=${groupId}`}>
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Group Settings</h1>
          <p className="text-slate-500">{group.name}</p>
        </div>
      </div>

      {/* General Settings */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar Upload */}
          <div className="flex items-center gap-6">
            <div className="relative">
              {group.avatar_url ? (
                <img 
                  src={group.avatar_url} 
                  alt={group.name}
                  className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <Avatar className="w-24 h-24 bg-gradient-to-br from-indigo-400 to-purple-500">
                  <AvatarFallback className="bg-transparent text-white text-3xl font-bold">
                    {getInitials(group.name)}
                  </AvatarFallback>
                </Avatar>
              )}
              {isOwner && (
                <button
                  onClick={(): void => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border-2 border-indigo-100 hover:bg-indigo-50 transition-colors"
                >
                  {uploadingAvatar ? (
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-indigo-600" />
                  )}
                </button>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-800">{group.name}</h3>
              <p className="text-slate-500 capitalize">{group.type} Group</p>
              {isOwner && (
                <p className="text-xs text-slate-400 mt-1">Click camera to change avatar</p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Group Name</Label>
            <Input
              value={editedGroup.name}
              onChange={(e) => setEditedGroup({ ...editedGroup, name: e.target.value })}
              className="rounded-xl"
              disabled={!isOwner}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={editedGroup.description}
              onChange={(e) => setEditedGroup({ ...editedGroup, description: e.target.value })}
              className="rounded-xl"
              disabled={!isOwner}
            />
          </div>
          
          {/* Couple-specific settings */}
          {group.type === 'couple' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                When did you meet?
              </Label>
              <Input
                type="date"
                value={editedGroup.couple_start_date ? format(new Date(editedGroup.couple_start_date), 'yyyy-MM-dd') : ''}
                onChange={(e) => setEditedGroup({ ...editedGroup, couple_start_date: e.target.value })}
                className="rounded-xl"
                min="2015-01-01"
                disabled={!isOwner}
              />
              <p className="text-xs text-slate-500">This will be used to track your relationship anniversary</p>
            </div>
          )}

          {isOwner && (
            <Button 
              onClick={() => updateGroupMutation.mutate(editedGroup)}
              disabled={updateGroupMutation.isPending}
              className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateGroupMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
          </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-500" />
            Group Notifications
          </CardTitle>
          <CardDescription>Configure notification preferences for this group</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Enable Notifications</p>
              <p className="text-sm text-slate-500">Receive updates about this group</p>
            </div>
            <Switch
              checked={editedGroup.notifications_enabled}
              onCheckedChange={(checked) => setEditedGroup({ ...editedGroup, notifications_enabled: checked })}
              disabled={!isAdmin}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Task Assignments</p>
              <p className="text-sm text-slate-500">Notify when tasks are assigned</p>
            </div>
            <Switch
              checked={editedGroup.notify_on_task_assignment}
              onCheckedChange={(checked) => setEditedGroup({ ...editedGroup, notify_on_task_assignment: checked })}
              disabled={!editedGroup.notifications_enabled || !isAdmin}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Event Changes</p>
              <p className="text-sm text-slate-500">Notify when events are created or updated</p>
            </div>
            <Switch
              checked={editedGroup.notify_on_event_changes}
              onCheckedChange={(checked) => setEditedGroup({ ...editedGroup, notify_on_event_changes: checked })}
              disabled={!editedGroup.notifications_enabled || !isAdmin}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">New Notes</p>
              <p className="text-sm text-slate-500">Notify when new collaborative notes are created</p>
            </div>
            <Switch
              checked={editedGroup.notify_on_new_notes}
              onCheckedChange={(checked) => setEditedGroup({ ...editedGroup, notify_on_new_notes: checked })}
              disabled={!editedGroup.notifications_enabled || !isAdmin}
            />
          </div>
          {isAdmin && (
            <>
              <Separator />
              <Button 
                onClick={() => updateGroupMutation.mutate(editedGroup)}
                disabled={updateGroupMutation.isPending}
                variant="outline"
                className="rounded-full w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Notification Settings
              </Button>
            </>
          )}
          </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-500" />
            Privacy & Permissions
          </CardTitle>
          <CardDescription>Control who can join and manage this group</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Private Group</p>
              <p className="text-sm text-slate-500">Members can only join via invitation</p>
            </div>
            <Switch
              checked={editedGroup.is_private}
              onCheckedChange={(checked) => setEditedGroup({ ...editedGroup, is_private: checked })}
              disabled={!isOwner}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Member Invites</p>
              <p className="text-sm text-slate-500">Allow admins to invite new members</p>
            </div>
            <Switch
              checked={editedGroup.allow_member_invites}
              onCheckedChange={(checked) => setEditedGroup({ ...editedGroup, allow_member_invites: checked })}
              disabled={!isOwner}
            />
          </div>
          {isOwner && (
            <>
              <Separator />
              <Button 
                onClick={() => updateGroupMutation.mutate(editedGroup)}
                disabled={updateGroupMutation.isPending}
                variant="outline"
                className="rounded-full w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Privacy Settings
              </Button>
            </>
          )}
          </CardContent>
          </Card>

      {/* Members & Roles */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            Members & Roles ({group.members?.length || 1})
          </CardTitle>
          <CardDescription>
            {group.type === 'couple' 
              ? 'Couple groups are limited to 2 members' 
              : 'Manage members and their permissions'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Member List */}
          <div className="space-y-3">
            {group.members?.map((email: string) => (
              <div key={email} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <Avatar className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500">
                  <AvatarFallback className="bg-transparent text-white text-sm">
                    {getInitials(group.member_names?.[email])}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {group.member_names?.[email] || email}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{email}</p>
                </div>
                <RoleManager
                  member={email}
                  group={group}
                  currentUser={user}
                  onRoleChange={(roleEmail: string, role: string): void => changeRoleMutation.mutate({ email: roleEmail, role })}
                />
                {email !== group.owner && isOwner && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeMemberMutation.mutate(email)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Invite Form */}
          {canManageMembers && (group.type !== 'couple' || group.members?.length < 2) && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-500" />
                  Invite New Member
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="rounded-xl flex-1"
                  />
                  <Button 
                    onClick={() => inviteMutation.mutate(inviteEmail)}
                    disabled={!inviteEmail || inviteMutation.isPending}
                    className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Invite
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Transfer Ownership */}
      {isOwner && group.members?.length > 1 && (
        <Card className="border-0 shadow-xl bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-amber-700 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Transfer Ownership
            </CardTitle>
            <CardDescription>Transfer ownership of this group to another member</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Transferring ownership will make another member the owner of this group. 
              You will become an admin and will no longer be able to delete the group or transfer ownership again.
            </p>
            <div className="space-y-3">
              <Label>Select New Owner</Label>
              <Select value={transferEmail} onValueChange={setTransferEmail}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent>
                  {group.members?.filter((email: string) => email !== group.owner).map((email: string) => (
                    <SelectItem key={email} value={email}>
                      {group.member_names?.[email] || email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AlertDialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline"
                  disabled={!transferEmail}
                  className="rounded-full w-full border-amber-200 text-amber-700 hover:bg-amber-100"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Transfer Ownership
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Ownership Transfer</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to transfer ownership to {group.member_names?.[transferEmail] || transferEmail}? 
                    This action will make them the owner and you will become an admin. You cannot undo this action.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => transferOwnershipMutation.mutate(transferEmail)}
                    className="rounded-full bg-amber-600 hover:bg-amber-700"
                  >
                    Transfer Ownership
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Group Info */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            Group Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Type</span>
            <Badge variant="secondary" className="capitalize rounded-full">{group.type}</Badge>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Created</span>
            {/* Note: backend returns 'created_date' via our adapter or 'createdAt' */}
            <span className="text-slate-800">{group.created_date ? format(new Date(group.created_date), 'MMMM d, yyyy') : 'N/A'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Owner</span>
            <span className="text-slate-800">{group.member_names?.[group.owner] || group.owner}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500">Members</span>
            <span className="text-slate-800">{group.members?.length || 1}</span>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isOwner && (
        <Card className="border-0 shadow-xl bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              Once you delete a group, all its data (tasks, notes, events) will be permanently removed.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="rounded-full">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Group
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All tasks, notes, and events associated with this group will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => deleteGroupMutation.mutate()}
                    className="rounded-full bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}