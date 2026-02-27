import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Heart, Briefcase, Plus, Search, Settings, 
  MoreVertical, Trash2
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from 'framer-motion';
import { toast } from "sonner";

// ✅ Import Real APIs
import { userApi } from "@/api/user.api";
import { groupApi } from "@/api/group.api";
import type { User } from "@/types/user";
import type { Group, CreateGroupPayload } from "@/types/group";

export default function Groups() {
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroup, setNewGroup] = useState<CreateGroupPayload>({
    name: '',
    type: 'family',
    description: '',
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async (): Promise<void> => {
    try {
      // ✅ Use Real User API
      const userData: any = await userApi.getMe();
      setUser(userData);
    } catch (e) {
      // Handle redirect or error
      console.error(e);
    }
  };

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups', user?.email],
    queryFn: async () => {
      // ✅ Use Real Group API
      const allGroups = await groupApi.list();
      return allGroups; // Backend already filters by user
    },
    enabled: !!user?.email,
  });

  const createGroupMutation = useMutation({
    mutationFn: async (groupData: CreateGroupPayload) => {
      if (!user) return;
      // ✅ Use Real Group API
      // Backend automatically sets owner, members, etc. from Auth Token
      return await groupApi.create(groupData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setCreateOpen(false);
      setNewGroup({ name: '', type: 'family', description: '' });
      toast.success('Group created successfully!');
    },
    onError: () => {
      toast.error('Failed to create group');
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string): Promise<void> => {
      // ✅ Use Real Group API
      await groupApi.delete(groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group deleted');
    },
    onError: () => {
      toast.error('Failed to delete group');
    }
  });

  const getGroupIcon = (type: string) => {
    switch (type) {
      case 'couple': return Heart;
      case 'family': return Users;
      case 'work': return Briefcase;
      default: return Users;
    }
  };

  const getGroupColor = (type: string): string => {
    switch (type) {
      case 'couple': return 'from-pink-500 to-rose-500';
      case 'family': return 'from-indigo-500 to-purple-500';
      case 'work': return 'from-emerald-500 to-teal-500';
      default: return 'from-blue-500 to-cyan-500';
    }
  };

  const filteredGroups = groups.filter((g: Group) => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupsByType = {
    couple: filteredGroups.filter((g: Group) => g.type === 'couple'),
    family: filteredGroups.filter((g: Group) => g.type === 'family'),
    work: filteredGroups.filter((g: Group) => g.type === 'work'),
    friends: filteredGroups.filter((g: Group) => g.type === 'friends'),
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Groups</h1>
          <p className="text-slate-500 mt-1">Manage your shared spaces</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 shadow-lg shadow-indigo-500/30">
              <Plus className="w-4 h-4 mr-2" /> Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input
                  placeholder="Enter group name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Group Type</Label>
                <Select
                  value={newGroup.type}
                  onValueChange={(value: any) => setNewGroup({ ...newGroup, type: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="couple">Couple (max 2 people)</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="What's this group about?"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <Button 
                onClick={() => createGroupMutation.mutate(newGroup)}
                disabled={!newGroup.name || createGroupMutation.isPending}
                className="w-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
              >
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 py-6 rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm"
        />
      </div>

      {/* Groups Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-3xl" />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">No groups yet</h3>
          <p className="text-slate-500 mb-6">Create your first group to get started</p>
          <Button 
            onClick={() => setCreateOpen(true)}
            className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" /> Create Group
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupsByType).map(([type, typeGroups]) => {
            if (typeGroups.length === 0) return null;
            const Icon = getGroupIcon(type);
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="w-5 h-5 text-slate-500" />
                  <h2 className="text-lg font-semibold text-slate-700 capitalize">{type} Groups</h2>
                  <Badge variant="secondary" className="rounded-full">{typeGroups.length}</Badge>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {typeGroups.map((group: any, index: number) => {
                    const GroupIcon = getGroupIcon(group.type);
                    return (
                      <motion.div
                        key={group.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur-sm overflow-hidden group">
                          <div className={`h-2 bg-gradient-to-r ${getGroupColor(group.type)}`} />
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getGroupColor(group.type)} flex items-center justify-center shadow-lg`}>
                                <GroupIcon className="w-7 h-7 text-white" />
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                  <DropdownMenuItem asChild>
                                    <Link to={`${createPageUrl('GroupSettings')}?id=${group.id}`}>
                                      <Settings className="w-4 h-4 mr-2" /> Settings
                                    </Link>
                                  </DropdownMenuItem>
                                  {group.owner === user?.email && (
                                    <DropdownMenuItem 
                                      onClick={() => deleteGroupMutation.mutate(group.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-1">{group.name}</h3>
                            <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                              {group.description || 'No description'}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Users className="w-4 h-4" />
                                <span>{group.members?.length || 1} members</span>
                              </div>
                              <Link to={`${createPageUrl('GroupDetail')}?id=${group.id}`}>
                                <Button variant="ghost" className="rounded-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                  Open
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}