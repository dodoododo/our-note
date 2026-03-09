import { useState, useEffect } from 'react';
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
  DialogDescription,
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

// ✅ Real API Imports
import { userApi } from "@/api/user.api";
import { groupApi } from "@/api/group.api";
import { noteApi } from "@/api/note.api";
import type { Note, CreateNotePayload, UpdateNotePayload } from "@/types/note";

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
  const [viewNoteModal, setViewNoteModal] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  const [newNote, setNewNote] = useState<CreateNotePayload>({
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
      const userData = await userApi.getMe();
      setUser(userData);
    } catch (e) {
      console.error("Failed to load user", e);
    }
  };

  const { data: groups = [] } = useQuery({
    queryKey: ['groups', user?.email],
    queryFn: async (): Promise<any[]> => {
      if (!user?.email) return [];
      const allGroups = await groupApi.list();
      return allGroups.filter((g: any) => g.members?.includes(user.email) || g.owner === user.email);
    },
    enabled: !!user?.email,
  });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', groups, selectedGroup],
    queryFn: async (): Promise<Note[]> => {
      const allNotes = await noteApi.list();
      const groupIds = selectedGroup === 'all' ? groups.map((g: any) => g.id) : [selectedGroup];
      
      return allNotes
        .filter((n: Note) => groupIds.includes(n.group_id))
        .sort((a: Note, b: Note) => {
           const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
           const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
           return timeB - timeA;
        });
    },
    enabled: groups.length > 0,
  });

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: CreateNotePayload | UpdateNotePayload): Promise<any> => {
      if (editingNote) {
        const targetId = (editingNote._id || editingNote.id) as string;
        
        const payload = { ...noteData };
        delete (payload as any).id;
        delete (payload as any)._id;
        
        return await noteApi.update(targetId, payload as UpdateNotePayload);
      }
      return await noteApi.create(noteData as CreateNotePayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setNoteModalOpen(false);
      setEditingNote(null);
      resetNewNote();
      toast.success(editingNote ? 'Note updated and synced!' : 'Note created!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to save note');
      console.error("Note Save Error:", error);
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateNotePayload }): Promise<void> => {
      await noteApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id: string): Promise<any> => noteApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note deleted');
    },
    onError: () => {
      toast.error('Failed to delete note');
    }
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

  const openEditNote = (note: Note): void => {
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

  const togglePin = (note: Note): void => {
    const targetId = (note._id || note.id) as string; 
    updateNoteMutation.mutate({
      id: targetId,
      data: { is_pinned: !note.is_pinned }
    });
  };

  const filteredNotes = notes.filter((note: Note) => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pinnedNotes = filteredNotes.filter((n: Note) => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter((n: Note) => !n.is_pinned);

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
            <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
              <RefreshCw className="w-3 h-3 animate-spin-slow" />
              Live sync
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedGroup !== 'all' && user && (
            <PresenceIndicator groupId={selectedGroup} page="notes" user={user} />
          )}
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-48 rounded-xl font-medium">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map((group: any) => (
                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => {
              resetNewNote();
              setNoteModalOpen(true);
            }}
            className="rounded-full bg-linear-to-r from-indigo-500 to-purple-600 text-white font-medium px-6 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5 mr-2" /> New Note
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
          className="pl-12 py-6 rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm text-base shadow-sm"
        />
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <FileText className="w-12 h-12 text-indigo-300" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">No notes yet</h3>
          <p className="text-slate-500 mb-8 text-lg">Capture your thoughts and collaborate.</p>
          <Button 
            onClick={() => {
              resetNewNote();
              setNoteModalOpen(true);
            }}
            className="rounded-full bg-linear-to-r from-indigo-500 to-purple-600 text-white px-8 py-6 text-lg shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5 mr-2" /> Create First Note
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Pin className="w-5 h-5 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Pinned</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                <AnimatePresence>
                  {pinnedNotes.map((note) => (
                    <NoteCard
                      key={note._id || note.id || Math.random().toString(36).substring(2, 9)}
                      note={note}
                      groups={groups}
                      onView={() => setViewNoteModal(note)}
                      onEdit={() => openEditNote(note)}
                      onDelete={() => deleteNoteMutation.mutate((note._id || note.id) as string)}
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
                <div className="flex items-center gap-2 mb-6">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">My Notes</h2>
                </div>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                <AnimatePresence>
                  {unpinnedNotes.map((note) => (
                    <NoteCard
                      key={note._id || note.id || Math.random().toString(36).substring(2, 9)}
                      note={note}
                      groups={groups}
                      onView={() => setViewNoteModal(note)}
                      onEdit={() => openEditNote(note)}
                      onDelete={() => deleteNoteMutation.mutate((note._id || note.id) as string)}
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

      {/* TWEAKED: Create/Edit Note Modal - Much wider and taller */}
      {/* Create/Edit Note Modal */}
      <Dialog open={noteModalOpen} onOpenChange={(open) => {
        setNoteModalOpen(open);
        if (!open) {
          setEditingNote(null);
          resetNewNote();
        }
      }}>
        {/* Đã đổi max-h-[95vh] thành max-h-[90vh] để có khoảng hở trên/dưới an toàn */}
        <DialogContent className="sm:max-w-4xl w-[95vw] rounded-3xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl p-6 md:p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl">{editingNote ? 'Edit Note' : 'Create Note'}</DialogTitle>
            <DialogDescription className="sr-only">Form to create or edit a note</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            {editingNote && groups.find(g => g.id === editingNote.group_id)?.members?.length > 1 && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-blue-900">Collaborative Note</p>
                  <p className="text-blue-700/80 mt-0.5">
                    {groups.find(g => g.id === editingNote.group_id)?.members?.length} members can view and edit this note
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <Label className="text-slate-600 font-semibold">Title</Label>
              <Input
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                placeholder="Give your note a title..."
                className="rounded-xl text-xl font-bold border-slate-200 py-7 px-5"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-slate-600 font-semibold">Group</Label>
                <Select value={newNote.group_id} onValueChange={(v) => setNewNote({ ...newNote, group_id: v })}>
                  <SelectTrigger className="rounded-xl py-6 px-4 border-slate-200">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group: any) => (
                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-slate-600 font-semibold">Note Theme</Label>
                <div className="flex gap-4 items-center h-12">
                  {noteColors.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setNewNote({ ...newNote, color: color.value })}
                      className={`w-9 h-9 rounded-full border-2 transition-all duration-200 ${
                        newNote.color === color.value 
                          ? 'scale-125 border-slate-400 shadow-md ring-4 ring-slate-100' 
                          : 'border-black/5 hover:scale-110 hover:shadow-sm'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* TWEAKED: Khung nhập liệu thông minh, tự động cuộn nội dung bên trong */}
            <div className="space-y-3 flex flex-col">
              <Label className="text-slate-600 font-semibold">Content</Label>
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm [&_.ql-editor]:min-h-[300px] md:[&_.ql-editor]:min-h-[500px] [&_.ql-editor]:max-h-[60vh]">
                <ReactQuill
                  value={newNote.content}
                  onChange={(content: any) => setNewNote({ ...newNote, content })}
                  theme="snow"
                  placeholder="Start writing your thoughts here..."
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
                      ['link', 'image', 'code-block'],
                      ['clean']
                    ],
                  }}
                  // Đã xóa style={{ height: '450px' }} gây kẹt màn hình
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6 pb-2 border-t border-slate-100">
              {editingNote && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    deleteNoteMutation.mutate((editingNote._id || editingNote.id) as string);
                    setNoteModalOpen(false);
                    setEditingNote(null);
                  }}
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold py-6 px-8 text-base"
                >
                  Delete Note
                </Button>
              )}
              <Button 
                onClick={() => createNoteMutation.mutate(newNote)}
                disabled={!newNote.title || !newNote.group_id || createNoteMutation.isPending}
                className="flex-1 relative overflow-hidden rounded-xl
                          bg-linear-to-r from-indigo-500 to-purple-600
                          text-white font-bold py-6 text-lg
                          shadow-lg
                          transition-all duration-300
                          hover:-translate-y-0.5 hover:shadow-xl
                          before:absolute before:inset-0
                          before:bg-gradient-to-r
                          before:from-transparent before:via-white/30 before:to-transparent
                          before:-translate-x-full
                          hover:before:translate-x-full
                          before:transition-transform before:duration-700
                          "
              >
                {createNoteMutation.isPending ? 'Saving changes...' : editingNote ? 'Update Note' : 'Create Note'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* TWEAKED: View Note Modal - Made wider to match */}
      <Dialog open={!!viewNoteModal} onOpenChange={(open) => !open && setViewNoteModal(null)}>
        <DialogContent 
          className="sm:max-w-4xl w-[95vw] rounded-3xl max-h-[95vh] overflow-y-auto border-0 shadow-2xl"
          style={{ backgroundColor: viewNoteModal?.color || '#ffffff' }}
        >
          <DialogHeader className="pb-4 border-b border-black/5">
            <DialogTitle className="text-4xl font-bold text-slate-800 leading-tight pt-2">{viewNoteModal?.title}</DialogTitle>
            <DialogDescription className="sr-only">View note details</DialogDescription>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 pt-4">
              <span className="flex items-center gap-1.5 bg-white/60 px-4 py-1.5 rounded-full font-medium shadow-sm">
                <User className="w-4 h-4" />
                {viewNoteModal?.author_name}
              </span>
              <span className="flex items-center gap-1.5 bg-white/60 px-4 py-1.5 rounded-full font-medium shadow-sm">
                <Clock className="w-4 h-4" />
                {viewNoteModal?.created_at && format(new Date(viewNoteModal.created_at), 'MMMM d, yyyy')}
              </span>
              {viewNoteModal?.last_edited_name && viewNoteModal.last_edited_name !== viewNoteModal.author_name && (
                <span className="flex items-center gap-1.5 bg-blue-500/10 text-blue-700 px-4 py-1.5 rounded-full font-medium shadow-sm">
                  <Edit2 className="w-4 h-4" />
                  Edited by {viewNoteModal.last_edited_name}
                </span>
              )}
            </div>
          </DialogHeader>
          <div className="pt-8 pb-12 ql-snow min-h-[300px]">
            <div 
              className="ql-editor px-0 text-[17px] leading-loose text-slate-700"
              dangerouslySetInnerHTML={{ __html: viewNoteModal?.content || '<span class="italic opacity-50">Empty note</span>' }}
            />
          </div>
          <div className="flex gap-3 pt-6 border-t border-black/5">
            <Button
              onClick={() => {
                const noteToEdit = viewNoteModal; 
                setViewNoteModal(null);
                if (noteToEdit) openEditNote(noteToEdit);
              }}
              className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 px-8 py-6 text-base font-semibold shadow-md"
            >
              <Edit2 className="w-5 h-5 mr-2" /> Edit Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoteCard({ note, groups, onView, onEdit, onDelete, onTogglePin, stripHtml }: { note: Note; groups: any[]; onView: () => void; onEdit: () => void; onDelete: () => void; onTogglePin: () => void; stripHtml: (html: any) => string }) {
  const group = groups.find((g: any) => g.id === note.group_id);
  const isCollaborative = group?.members?.length > 1;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="border border-black/5 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden group h-full flex flex-col rounded-2xl min-h-[240px]"
        style={{ backgroundColor: note.color || '#ffffff' }}
        onClick={onView}
      >
        <CardContent className="p-6 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 pr-3">
              <h3 className="text-lg font-bold text-slate-800 line-clamp-2 leading-tight tracking-tight">
                {note.title}
              </h3>
              {isCollaborative && (
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-2 opacity-80">
                  <Users className="w-3.5 h-3.5" />
                  {group.members.length} members
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-full bg-white/40 hover:bg-white/80 ${note.is_pinned ? 'text-amber-500 opacity-100' : 'text-slate-500'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin();
                }}
              >
                <Pin className="w-4 h-4" fill={note.is_pinned ? 'currentColor' : 'none'} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/40 hover:bg-white/80 text-slate-600">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl shadow-lg border-slate-100">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }} className="font-medium py-2">
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="text-red-600 font-medium py-2 focus:bg-red-50 focus:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <p className="text-[15px] leading-relaxed text-slate-700/90 line-clamp-4 mb-4 flex-1">
            {stripHtml(note.content) || <span className="italic opacity-50">Empty note</span>}
          </p>
          
          <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-black/10 mt-auto font-medium">
            <div className="flex flex-col gap-1">
              <span className="text-slate-700">{note.author_name}</span>
              {note.last_edited_name && note.last_edited_name !== note.author_name && (
                <span className="text-indigo-600 flex items-center gap-1">
                  <Edit2 className="w-3 h-3" />
                  {note.last_edited_name}
                </span>
              )}
            </div>
            {group && <Badge variant="secondary" className="rounded-lg text-[11px] px-2.5 py-0.5 bg-white/60 border-0 shadow-xs text-slate-600 hover:bg-white/80 transition-colors">{group.name}</Badge>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}