import { useState, useEffect } from 'react';
import { mockApiClient } from '@/lib/mockApiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { 
  Plus, Search, FileText, Pin, MoreVertical, Trash2, 
  Edit2, User, Clock, Users, RefreshCw
} from 'lucide-react';
import PresenceIndicator from '../components/presence/PresenceIndicator.tsx';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import { format } from 'date-fns';

const noteColors = [
  { name: 'White', value: '#ffffff' },
  { name: 'Yellow', value: '#FEF3C7' },
  { name: 'Green', value: '#D1FAE5' },
  { name: 'Blue', value: '#DBEAFE' },
  { name: 'Purple', value: '#EDE9FE' },
  { name: 'Pink', value: '#FCE7F3' },
];

export default function Notes() {
  const [user, setUser] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [noteModalOpen, setNoteModalOpen] = useState<boolean>(false);
  const [viewNoteModal, setViewNoteModal] = useState<any>(null);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    group_id: '',
    color: '#ffffff',
    is_pinned: false
  });
  
  const urlParams = new URLSearchParams(window.location.search);
  const initialGroup = urlParams.get('group');
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
    if (initialGroup) {
      setSelectedGroup(initialGroup);
    }
  }, []);

  const loadUser = async (): Promise<void> => {
    try {
      const userData = await mockApiClient.auth.me();
      setUser(userData);
    } catch (e) {
      mockApiClient.auth.redirectToLogin();
    }
  };

  const { data: groups = [] } = useQuery({
    queryKey: ['groups', user?.email],
    queryFn: async (): Promise<any[]> => {
      if (!user?.email) return [];
      const allGroups = await mockApiClient.entities.Group.list();
      return allGroups.filter((g: any) => g.members?.includes(user.email) || g.owner === user.email);
    },
    enabled: !!user?.email,
  });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', groups, selectedGroup],
    queryFn: async (): Promise<any[]> => {
      const groupIds = selectedGroup === 'all' ? groups.map((g: any) => g.id) : [selectedGroup];
      const allNotes = await mockApiClient.entities.Note.list('-updated_date');
      return allNotes.filter((n: any) => groupIds.includes(n.group_id));
    },
    enabled: groups.length > 0,
    refetchInterval: 5000, // Auto-refresh every 5 seconds for real-time collaboration
  });

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: any): Promise<any> => {
      if (!user) return;
      const data = {
        ...noteData,
        last_edited_by: user.email,
        last_edited_name: user.full_name
      };
      if (editingNote) {
        return await mockApiClient.entities.Note.update(editingNote.id, data);
      }
      // For new notes, set author
      return await mockApiClient.entities.Note.create({
        ...data,
        author_email: user.email,
        author_name: user.full_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setNoteModalOpen(false);
      setEditingNote(null);
      resetNewNote();
      toast.success(editingNote ? 'Note updated and synced!' : 'Note created!');
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }): Promise<void> => {
      await mockApiClient.entities.Note.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id: string): Promise<void> => mockApiClient.entities.Note.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note deleted');
    },
  });

  const resetNewNote = (): void => {
    setNewNote({
      title: '',
      content: '',
      group_id: selectedGroup !== 'all' ? selectedGroup : (groups[0]?.id || ''),
      color: '#ffffff',
      is_pinned: false
    });
  };

  const openEditNote = (note: any): void => {
    setEditingNote(note);
    setNewNote({
      title: note.title,
      content: note.content || '',
      group_id: note.group_id,
      color: note.color || '#ffffff',
      is_pinned: note.is_pinned || false
    });
    setNoteModalOpen(true);
  };

  const togglePin = (note: any): void => {
    updateNoteMutation.mutate({
      id: note.id,
      data: { is_pinned: !note.is_pinned }
    });
  };

  const filteredNotes = notes.filter((note: any) => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pinnedNotes = filteredNotes.filter((n: any) => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter((n: any) => !n.is_pinned);

  const stripHtml = (html: any): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Notes</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            Collaborative notes for your groups
            <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
              <RefreshCw className="w-3 h-3" />
              Live sync
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedGroup !== 'all' && user && (
            <PresenceIndicator groupId={selectedGroup} page="notes" user={user} />
          )}
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => {
              resetNewNote();
              setNoteModalOpen(true);
            }}
            className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" /> New Note
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 py-6 rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm"
        />
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">No notes yet</h3>
          <p className="text-slate-500 mb-6">Create your first note to get started</p>
          <Button 
            onClick={() => {
              resetNewNote();
              setNoteModalOpen(true);
            }}
            className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" /> Create Note
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Pin className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pinned</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence>
                  {pinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      groups={groups}
                      onView={() => setViewNoteModal(note)}
                      onEdit={() => openEditNote(note)}
                      onDelete={() => deleteNoteMutation.mutate(note.id)}
                      onTogglePin={() => togglePin(note)}
                      stripHtml={stripHtml}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Other Notes */}
          {unpinnedNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Other Notes</h2>
                </div>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence>
                  {unpinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      groups={groups}
                      onView={() => setViewNoteModal(note)}
                      onEdit={() => openEditNote(note)}
                      onDelete={() => deleteNoteMutation.mutate(note.id)}
                      onTogglePin={() => togglePin(note)}
                      stripHtml={stripHtml}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Note Modal */}
      <Dialog open={noteModalOpen} onOpenChange={(open) => {
        setNoteModalOpen(open);
        if (!open) {
          setEditingNote(null);
          resetNewNote();
        }
      }}>
        <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Note' : 'Create Note'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {editingNote && groups.find(g => g.id === editingNote.group_id)?.members?.length > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                <Users className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Collaborative Note</p>
                  <p className="text-blue-700">
                    {groups.find(g => g.id === editingNote.group_id)?.members?.length} members can view and edit this note
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                placeholder="Note title"
                className="rounded-xl text-lg font-semibold"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Group</Label>
                <Select value={newNote.group_id} onValueChange={(v) => setNewNote({ ...newNote, group_id: v })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {noteColors.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setNewNote({ ...newNote, color: color.value })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        newNote.color === color.value 
                          ? 'scale-110 border-indigo-500' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <div className="rounded-xl overflow-hidden border bg-white" style={{ minHeight: '250px' }}>
                <ReactQuill
                  value={newNote.content}
                  onChange={(content: any) => setNewNote({ ...newNote, content })}
                  theme="snow"
                  placeholder="Write your note..."
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['link'],
                      ['clean']
                    ],
                  }}
                  style={{ height: '200px' }}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              {editingNote && (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    deleteNoteMutation.mutate(editingNote.id);
                    setNoteModalOpen(false);
                    setEditingNote(null);
                  }}
                  className="rounded-full"
                >
                  Delete
                </Button>
              )}
              <Button 
                onClick={() => createNoteMutation.mutate(newNote)}
                disabled={!newNote.title || !newNote.group_id || createNoteMutation.isPending}
                className="flex-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
              >
                {createNoteMutation.isPending ? 'Saving...' : editingNote ? 'Update Note' : 'Create Note'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Note Modal */}
      <Dialog open={!!viewNoteModal} onOpenChange={() => setViewNoteModal(null)}>
        <DialogContent 
          className="sm:max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto"
          style={{ backgroundColor: viewNoteModal?.color || '#ffffff' }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl">{viewNoteModal?.title}</DialogTitle>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 pt-2">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                Created by {viewNoteModal?.author_name}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {viewNoteModal?.created_date && format(new Date(viewNoteModal.created_date), 'MMM d, yyyy')}
              </span>
              {viewNoteModal?.last_edited_name && viewNoteModal.last_edited_name !== viewNoteModal.author_name && (
                <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  <Edit2 className="w-3 h-3" />
                  Edited by {viewNoteModal.last_edited_name}
                </span>
              )}
            </div>
          </DialogHeader>
          <div 
            className="prose prose-sm max-w-none pt-4"
            dangerouslySetInnerHTML={{ __html: viewNoteModal?.content || '' }}
          />
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setViewNoteModal(null);
                openEditNote(viewNoteModal);
              }}
              className="rounded-full"
            >
              <Edit2 className="w-4 h-4 mr-2" /> Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoteCard({ note, groups, onView, onEdit, onDelete, onTogglePin, stripHtml }: { note: any; groups: any[]; onView: (note: any) => void; onEdit: (note: any) => void; onDelete: (id: string) => void; onTogglePin: (note: any) => void; stripHtml: (html: any) => string }) {
  const group = groups.find((g: any) => g.id === note.group_id);
  const isCollaborative = group?.members?.length > 1;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card 
        className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden group"
        style={{ backgroundColor: note.color || '#ffffff' }}
        onClick={onView}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 line-clamp-1">{note.title}</h3>
              {isCollaborative && (
                <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Users className="w-3 h-3" />
                  Shared with {group.members.length} members
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 rounded-full ${note.is_pinned ? 'text-amber-500' : 'text-slate-400'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(note);
                }}
              >
                <Pin className="w-3.5 h-3.5" fill={note.is_pinned ? 'currentColor' : 'none'} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onEdit(note);
                  }}>
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(note.id);
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="text-sm text-slate-600 line-clamp-3 mb-3">
            {stripHtml(note.content) || 'No content'}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex flex-col gap-0.5">
              <span>{note.author_name}</span>
              {note.last_edited_name && note.last_edited_name !== note.author_name && (
                <span className="text-blue-600 flex items-center gap-1">
                  <Edit2 className="w-2.5 h-2.5" />
                  Edited by {note.last_edited_name}
                </span>
              )}
            </div>
            {group && <Badge variant="secondary" className="rounded-full text-xs">{group.name}</Badge>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}