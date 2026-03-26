import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { 
  Plus, MoreVertical, Trash2, CheckSquare, 
  Clock, CheckCircle, X, GripVertical, Users, Link2, Edit2, LayoutDashboard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import { format } from 'date-fns';
import SubtaskList from '../components/tasks/SubtaskList';

// API Imports
import { userApi } from "@/api/user.api";
import { groupApi } from "@/api/group.api";
import { taskApi } from "@/api/task.api";
import { taskListApi } from "@/api/taskList.api";
import type { Task, TaskList, CreateTaskPayload, UpdateTaskPayload } from "@/types/task";

const listColors = [
  { name: 'Blurple', value: '#5865F2' },
  { name: 'Green', value: '#57F287' },
  { name: 'Yellow', value: '#FEE75C' },
  { name: 'Fuchsia', value: '#EB459E' },
  { name: 'Red', value: '#ED4245' },
  { name: 'Cyan', value: '#06b6d4' },
];

export default function Tasks() {
  const [user, setUser] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // TWEAKED: Đổi activeGroupId thành state quản lý việc chọn group trong form tạo List
  const [newListGroupId, setNewListGroupId] = useState<string>('');
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState('#5865F2'); 
  
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const editListInputRef = useRef<HTMLInputElement>(null);

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  
  const [newTask, setNewTask] = useState<CreateTaskPayload>({
    title: '',
    description: '',
    group_id: '',
    list_name: '',
    status: 'todo',
    label: 'normal',
    due_date: '',
    assigned_to: [],
    depends_on: []
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

  useEffect(() => {
    if (editingListId && editListInputRef.current) {
      editListInputRef.current.focus();
    }
  }, [editingListId]);

  const loadUser = async () => {
    try {
      const userData = await userApi.getMe();
      setUser(userData);
    } catch (e) {
      console.error("Failed to load user", e);
    }
  };

  const { data: groups = [] } = useQuery({
    queryKey: ['groups', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allGroups = await groupApi.list();
      return allGroups.filter((g: any) => g.members?.includes(user.email) || g.owner === user.email);
    },
    enabled: !!user?.email,
  });

  const { data: taskLists = [] } = useQuery<TaskList[]>({
    queryKey: ['taskLists', groups, selectedGroup],
    queryFn: async () => {
      const groupIds = selectedGroup === 'all' ? groups.map((g: any) => g.id) : [selectedGroup];
      const allLists = await taskListApi.list();
      return allLists
        .filter((l: TaskList) => groupIds.includes(l.group_id))
        .sort((a: TaskList, b: TaskList) => (a.order || 0) - (b.order || 0));
    },
    enabled: groups.length > 0,
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ['allTasks', groups, selectedGroup],
    queryFn: async () => {
      const groupIds = selectedGroup === 'all' ? groups.map((g: any) => g.id) : [selectedGroup];
      const tasks = await taskApi.list();
      return tasks.filter((t: Task) => groupIds.includes(t.group_id));
    },
    enabled: groups.length > 0,
    refetchInterval: 5000, 
  });

  const tasks = allTasks.filter(t => !t.parent_task_id);

  const getId = (entity: any) => (entity._id || entity.id) as string;

  const createListMutation = useMutation({
    mutationFn: async () => {
      await taskListApi.create({
        name: newListName,
        group_id: newListGroupId, // Sử dụng ID do user chọn trong modal
        order: taskLists.length,
        color: newListColor
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLists'] });
      setListModalOpen(false);
      setNewListName('');
      setNewListColor('#5865F2');
      toast.success('List created!');
    },
  });

  const updateListNameMutation = useMutation({
    mutationFn: async ({ id, newName, oldName }: { id: string; newName: string; oldName: string }) => {
      await taskListApi.update(id, { name: newName });
      const tasksToMove = tasks.filter(t => t.list_name === oldName);
      for (const task of tasksToMove) {
        await taskApi.update(getId(task), { list_name: newName });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLists'] });
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      setEditingListId(null);
      toast.success('List name updated');
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (listId: string) => {
      const listToDelete = taskLists.find(l => getId(l) === listId);
      if (listToDelete) {
         const tasksInList = tasks.filter(t => t.list_name === listToDelete.name);
         for (const task of tasksInList) {
           await taskApi.delete(getId(task));
         }
      }
      await taskListApi.delete(listId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLists'] });
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      toast.success('List deleted');
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: CreateTaskPayload | UpdateTaskPayload) => {
      if (editingTask) {
        const payload = { ...taskData };
        delete (payload as any).id;
        delete (payload as any)._id;
        return await taskApi.update(getId(editingTask), payload as UpdateTaskPayload);
      }
      
      const listTasks = tasks.filter(t => t.list_name === taskData.list_name && t.group_id === taskData.group_id);
      const newOrder = listTasks.length > 0 ? Math.max(...listTasks.map(t => t.order || 0)) + 1 : 0;
      
      return await taskApi.create({ ...taskData, order: newOrder } as CreateTaskPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      setTaskModalOpen(false);
      setEditingTask(null);
      resetNewTask();
      toast.success(editingTask ? 'Task updated!' : 'Task created!');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskPayload }) => {
      return await taskApi.update(id, data);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => taskApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      toast.success('Task deleted');
    },
  });

  const resetNewTask = () => {
    setNewTask({
      title: '',
      description: '',
      group_id: selectedGroup !== 'all' ? selectedGroup : (groups[0]?.id || ''),
      list_name: taskLists[0]?.name || '',
      status: 'todo',
      label: 'normal',
      due_date: '',
      assigned_to: [],
      depends_on: []
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'list') {
      const groupId = source.droppableId;
      const newLists = JSON.parse(JSON.stringify(taskLists)) as TaskList[];
      
      const groupLists = newLists
          .filter(l => l.group_id === groupId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

      const [removed] = groupLists.splice(source.index, 1);
      groupLists.splice(destination.index, 0, removed);
      
      groupLists.forEach((list, index) => {
        list.order = index;
      });

      const otherLists = newLists.filter(l => l.group_id !== groupId);
      const combinedLists = [...otherLists, ...groupLists];

      queryClient.setQueriesData({ queryKey: ['taskLists'] }, () => combinedLists);
      
      groupLists.forEach((list) => {
        taskListApi.update(getId(list), { order: list.order });
      });
      return;
    }

    const taskId = result.draggableId;
    const [sourceGroupId, sourceListName] = source.droppableId.split(':::');
    const [destGroupId, destListName] = destination.droppableId.split(':::');

    // TWEAKED: Chốt chặn an toàn - Cấm kéo thả khác Group
    if (sourceGroupId !== destGroupId) {
      return;
    }

    if (sourceGroupId === destGroupId && sourceListName === destListName && source.index === destination.index) {
      return; 
    }

    const newTasks = JSON.parse(JSON.stringify(allTasks)) as Task[];
    const draggedTask = newTasks.find(t => getId(t) === taskId);
    if (!draggedTask) return;

    draggedTask.list_name = destListName;
    draggedTask.group_id = destGroupId;

    const destTasks = newTasks
      .filter(t => t.list_name === destListName && t.group_id === destGroupId && !t.parent_task_id && getId(t) !== taskId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    destTasks.splice(destination.index, 0, draggedTask);

    destTasks.forEach((t, idx) => {
      t.order = idx;
    });

    if (sourceListName !== destListName || sourceGroupId !== destGroupId) {
        const sourceTasks = newTasks
          .filter(t => t.list_name === sourceListName && t.group_id === sourceGroupId && !t.parent_task_id && getId(t) !== taskId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
          
        sourceTasks.forEach((t, idx) => {
          t.order = idx;
        });
    }

    queryClient.setQueriesData({ queryKey: ['allTasks'] }, () => newTasks);

    const apiPromises = [];
    const updatedDraggedTask = newTasks.find(t => getId(t) === taskId);
    
    if (updatedDraggedTask) {
        apiPromises.push(
          updateTaskMutation.mutateAsync({
              id: taskId,
              data: { list_name: destListName, group_id: destGroupId, order: updatedDraggedTask.order }
          })
        );
    }

    destTasks.forEach((t) => {
        if (getId(t) !== taskId) {
            apiPromises.push(
              updateTaskMutation.mutateAsync({ id: getId(t), data: { order: t.order } })
            );
        }
    });

    Promise.all(apiPromises).catch(error => {
      console.error("Lỗi đồng bộ vị trí drag/drop:", error);
      queryClient.invalidateQueries({ queryKey: ['allTasks'] }); 
    });
  };

  const handleSaveListName = (list: TaskList) => {
    const trimmedName = editingListName.trim();
    if (trimmedName && trimmedName !== list.name) {
      updateListNameMutation.mutate({ 
        id: getId(list), 
        newName: trimmedName,
        oldName: list.name 
      });
    } else {
      setEditingListId(null);
    }
  };

  const openAddTask = (listName: string, groupId: string) => {
    resetNewTask();
    setNewTask(prev => ({ 
      ...prev, 
      list_name: listName,
      group_id: groupId
    }));
    setTaskModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description || '',
      group_id: task.group_id,
      list_name: task.list_name,
      status: task.status || 'todo',
      label: task.label || 'normal',
      due_date: task.due_date || '',
      assigned_to: task.assigned_to || [],
      depends_on: task.depends_on || [],
      completed: task.completed
    });
    setTaskModalOpen(true);
  };

  const getSubtasks = (parentId: string) => {
    return allTasks.filter(t => t.parent_task_id === parentId);
  };

  const handleAddSubtask = async (parentId: string, title: string) => {
    const parentTask = allTasks.find(t => getId(t) === parentId);
    if (!parentTask) return;
    
    await taskApi.create({
      title,
      group_id: parentTask.group_id,
      list_name: parentTask.list_name,
      parent_task_id: parentId,
      status: 'todo',
      completed: false
    } as any); 
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    const subtask = allTasks.find(t => getId(t) === subtaskId);
    if (!subtask) return;
    
    const isCompleted = !subtask.completed;
    await updateTaskMutation.mutateAsync({
      id: subtaskId,
      data: { 
        completed: isCompleted,
        status: isCompleted ? 'done' : 'todo'
      }
    });
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    await deleteTaskMutation.mutateAsync(subtaskId);
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const canStartTask = (task: Task) => {
    if (!task.depends_on || task.depends_on.length === 0) return true;
    return task.depends_on.every(depId => {
      const depTask = allTasks.find(t => getId(t) === depId);
      return depTask?.completed || depTask?.status === 'done';
    });
  };

  const getTasksByList = (listName: string, groupId?: string) => {
    let filtered = tasks.filter(t => t.list_name === listName && t.group_id === groupId);
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }
    if (filterAssignee !== 'all') {
      filtered = filtered.filter(t => t.assigned_to?.includes(filterAssignee));
    }
    
    return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const groupedLists = selectedGroup === 'all' 
    ? groups.map((group: any) => ({
        group,
        lists: taskLists.filter(l => l.group_id === group.id)
      })).filter(g => g.lists.length > 0)
    : [{ group: groups.find((g: any) => g.id === selectedGroup), lists: taskLists }];

  return (
    <div className="max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Tasks</h1>
          <p className="text-slate-500 mt-1">Organize your to-dos like Trello</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups.map((group: any) => (
                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {selectedGroup !== 'all' && groups.find((g: any) => g.id === selectedGroup)?.members?.map((email: string) => {
                const group = groups.find((g: any) => g.id === selectedGroup);
                return (
                  <SelectItem key={email} value={email}>
                    {group?.member_names?.[email] || email}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={() => {
               // Chọn sẵn Group đầu tiên nếu đang ở All Groups
               setNewListGroupId(selectedGroup !== 'all' ? selectedGroup : (groups[0]?.id || ''));
               setListModalOpen(true);
            }}
            variant="outline"
            className="rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" /> Add List
          </Button>
        </div>
      </div>

      {/* Empty State Message */}
      {taskLists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-5">
            <LayoutDashboard className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Kanban Lists Yet</h3>
          <p className="text-slate-500 mb-8 max-w-md">
            {selectedGroup === 'all' 
              ? "You don't have any task lists across your groups. Create your first list to start organizing tasks."
              : "There are no task lists in this group yet. Create one to get started."}
          </p>
          <Button 
            onClick={() => {
              setNewListGroupId(selectedGroup !== 'all' ? selectedGroup : (groups[0]?.id || ''));
              setListModalOpen(true);
            }}
            className="rounded-full bg-linear-to-r from-indigo-500 to-purple-600 text-white font-medium px-8 py-6 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5 mr-2" /> Create First List
          </Button>
        </div>
      ) : (
        /* Kanban Board */
        <DragDropContext onDragEnd={handleDragEnd}>
          {groupedLists.map(({ group, lists }) => (
            <div key={group?.id || 'all'} className="mb-8">
              {selectedGroup === 'all' && (
                <h2 className="text-2xl font-semibold text-slate-700 mb-4">Group Name: {group?.name}</h2>
              )}
              <Droppable droppableId={group?.id || 'all'} type="list" direction="horizontal">
                {(provided) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex gap-4 overflow-x-auto pb-4 items-start"
                  >
                    {lists.map((list, index) => (
                      <Draggable key={getId(list)} draggableId={getId(list)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`shrink-0 w-88 ${snapshot.isDragging ? 'opacity-90' : ''}`}
                          >
                            <Card 
                              className="border-0 shadow-md bg-slate-50/60 min-h-30 max-h-[80vh] flex flex-col gap-0 overflow-hidden relative"
                              style={{ borderTop: `5px solid ${list.color || '#cbd5e1'}` }}
                              {...provided.dragHandleProps} 
                            >
                              <CardHeader 
                                className="px-4 py-2 bg-slate-50/60 sticky top-0 z-20 group cursor-grab active:cursor-grabbing border-b border-slate-200/50"
                              >
                                <div className="flex items-center justify-between w-full h-8">
                                  <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                                    <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                                    
                                    <div 
                                      className="flex-1 min-w-0 flex items-center"
                                      onPointerDown={(e) => e.stopPropagation()}
                                    >
                                      {editingListId === getId(list) ? (
                                        <Input
                                          ref={editListInputRef}
                                          value={editingListName}
                                          onChange={(e) => setEditingListName(e.target.value)}
                                          onBlur={() => handleSaveListName(list)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveListName(list);
                                            if (e.key === 'Escape') setEditingListId(null);
                                          }}
                                          className="h-7 px-2 text-sm font-bold text-slate-700 w-full"
                                          disabled={updateListNameMutation.isPending}
                                        />
                                      ) : (
                                        <CardTitle 
                                          className="text-base font-bold text-slate-700 truncate cursor-text hover:bg-slate-200/70 px-1.5 py-0.5 rounded transition-colors w-full"
                                          onClick={() => {
                                            setEditingListId(getId(list));
                                            setEditingListName(list.name);
                                          }}
                                          title="Click to edit name"
                                        >
                                          {list.name}
                                        </CardTitle>
                                      )}
                                    </div>

                                    <Badge variant="secondary" className="rounded-full shrink-0">
                                      {getTasksByList(list.name, group?.id).length}
                                    </Badge>
                                  </div>

                                  <div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="rounded-xl h-8 w-8 hover:bg-slate-200 shrink-0"
                                          onPointerDown={(e) => e.stopPropagation()}
                                        >
                                          <MoreVertical className="w-4 h-4 text-slate-500" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="rounded-xl shadow-lg border-slate-100">
                                        <DropdownMenuItem onClick={() => openAddTask(list.name, group.id)} className="font-medium cursor-pointer">
                                          <Plus className="w-4 h-4 mr-2" /> Add Task
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => {
                                            setEditingListId(getId(list));
                                            setEditingListName(list.name);
                                          }} 
                                          className="font-medium cursor-pointer"
                                        >
                                          <Edit2 className="w-4 h-4 mr-2" /> Rename List
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => deleteListMutation.mutate(getId(list))}
                                          className="text-red-600 font-medium focus:bg-red-50 focus:text-red-700 cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" /> Delete List
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </CardHeader>
                              
                              <CardContent className="p-3 pt-3 flex-1 overflow-y-auto custom-scrollbar bg-slate-200/50 min-h-0">
                                {/* TWEAKED: Thêm type có chứa group.id để thư viện chặn kéo thả chéo Group */}
                                <Droppable droppableId={`${group?.id}:::${list.name}`} type={`task-${group?.id}`}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className={`space-y-2.5 min-h-[2px] transition-colors rounded-xl ${
                                        snapshot.isDraggingOver ? 'bg-black/5 p-1 -mx-1' : ''
                                      }`}
                                    >
                                      <AnimatePresence>
                                        {getTasksByList(list.name, group?.id).map((task, taskIndex) => (
                                          <Draggable key={getId(task)} draggableId={getId(task)} index={taskIndex}>
                                            {(provided, snapshot) => (
                                              <div
                                                  ref={provided.innerRef}
                                                  {...provided.draggableProps}
                                                  {...provided.dragHandleProps}
                                                  style={{ ...provided.draggableProps.style }}
                                              >
                                                <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                  animate={{ opacity: 1, y: 0 }}
                                                  exit={{ opacity: 0, scale: 0.9 }}
                                                  className={`p-3.5 rounded-xl bg-white shadow-sm border border-slate-200/60 transition-all ${
                                                    snapshot.isDragging 
                                                      ? 'shadow-xl rotate-2 scale-105 border-indigo-200 cursor-grabbing' 
                                                      : 'hover:border-slate-300 hover:shadow-md cursor-grab active:cursor-grabbing'
                                                  } ${task.completed ? 'opacity-60 bg-slate-50' : ''}`}
                                                  onClick={() => openEditTask(task)}
                                                >
                                                  <div className="flex items-start gap-3">
                                                    <Checkbox
                                                      checked={task.completed || task.status === 'done'}
                                                      onCheckedChange={(checked) => {
                                                        const isDone = !!checked;
                                                        updateTaskMutation.mutate({
                                                          id: getId(task),
                                                          data: { 
                                                            completed: isDone,
                                                            status: isDone ? 'done' : 'todo'
                                                          }
                                                        });
                                                        queryClient.invalidateQueries({ queryKey: ['allTasks'] });
                                                      }}
                                                      onClick={(e) => e.stopPropagation()}
                                                      className="mt-1"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                      <p className={`font-semibold text-[15px] overflow-clip leading-tight ${(task.completed || task.status === 'done') ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                                        {task.title}
                                                      </p>
                                                      {task.description && (
                                                       <p className="text-[13px] text-slate-500 mt-1.5 line-clamp-2 leading-snug">
                                                         {task.description}
                                                       </p>
                                                      )}
                                                      <div className="flex flex-wrap items-center gap-2 mt-3">
                                                       <Badge 
                                                         variant="secondary" 
                                                         className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                           task.status === 'done' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                           task.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                           'bg-slate-100 text-slate-600 border-slate-200'
                                                         } border`}
                                                       >
                                                         {task.status === 'done' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                         {task.status === 'in_progress' && <Clock className="w-3 h-3 mr-1" />}
                                                         {task.status?.replace('_', ' ') || 'todo'}
                                                       </Badge>
                                                       
                                                       {task.due_date && (
                                                         <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                           {format(new Date(task.due_date), 'MMM d')}
                                                         </span>
                                                       )}
                                                       
                                                       {getSubtasks(getId(task)).length > 0 && (
                                                         <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                                                           <CheckSquare className="w-3 h-3" />
                                                           {getSubtasks(getId(task)).filter(s => s.completed || s.status === 'done').length}/{getSubtasks(getId(task)).length}
                                                         </span>
                                                       )}

                                                       {task.depends_on && task.depends_on.length > 0 && (
                                                         <Link2 className={`w-3.5 h-3.5 ml-auto ${canStartTask(task) ? 'text-emerald-500' : 'text-amber-500'}`} />
                                                       )}

                                                       {task.assigned_to && task.assigned_to.length > 0 && (
                                                         <div className="flex -space-x-1.5 ml-auto">
                                                           {task.assigned_to.slice(0, 3).map((email) => {
                                                             const targetGroup = groups.find((g: any) => g.id === task.group_id);
                                                             return (
                                                               <Avatar key={email} className="w-6 h-6 border-2 border-white bg-linear-to-br from-indigo-400 to-purple-500 shadow-sm">
                                                                 <AvatarFallback className="bg-transparent text-white text-[9px] font-bold">
                                                                   {getInitials(targetGroup?.member_names?.[email] || email)}
                                                                 </AvatarFallback>
                                                               </Avatar>
                                                             );
                                                           })}
                                                         </div>
                                                       )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </motion.div>
                                              </div>
                                            )}
                                          </Draggable>
                                        ))}
                                      </AnimatePresence>
                                      {provided.placeholder}
                                    </div>
                                  )}
                                </Droppable>
                              </CardContent>
                              
                              <div className="p-3 pt-5 shrink-0  sticky bottom-0 z-20 mt-auto">
                                <Button
                                  variant="ghost"
                                  className="w-full rounded-xl text-slate-600 hover:bg-slate-200 hover:text-slate-800 border border-dashed border-slate-500"
                                  onClick={() => openAddTask(list.name, group.id)}
                                >
                                  <Plus className="w-4 h-4 mr-2" /> Add a card
                                </Button>
                              </div>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    
                    {/* Add List Button */}
                    <div className="shrink-0 w-80">
                      <Button
                        variant="outline"
                        className="w-full h-[50px] rounded-xl border-dashed border-2 text-slate-500 hover:text-slate-700 hover:border-slate-400 bg-white/50 backdrop-blur-sm"
                        onClick={() => {
                          // Chọn sẵn đúng group của bảng đó
                          setNewListGroupId(group.id);
                          setListModalOpen(true);
                        }}
                      >
                        <Plus className="w-5 h-5 mr-2" /> Add another list
                      </Button>
                    </div>
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </DragDropContext>
      )}

      {/* Create List Modal */}
      <Dialog open={listModalOpen} onOpenChange={setListModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create New List</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            
            {/* TWEAKED: Thêm phần chọn Group cho cột */}
            <div className="space-y-2">
              <Label className="font-semibold text-slate-600">Group</Label>
              <Select value={newListGroupId} onValueChange={setNewListGroupId}>
                <SelectTrigger className="rounded-xl py-6">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-slate-600">List Name</Label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g., To Do, In Progress, Done"
                className="rounded-xl py-6"
              />
            </div>
            
            <div className="space-y-3">
              <Label className="font-semibold text-slate-600">Label Color</Label>
              <div className="flex gap-3 items-center">
                {listColors.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setNewListColor(color.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                      newListColor === color.value 
                        ? 'scale-125 border-slate-400 shadow-md ring-4 ring-slate-100' 
                        : 'border-black/5 hover:scale-110'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <Button 
              onClick={() => createListMutation.mutate()}
              disabled={!newListName || !newListGroupId || createListMutation.isPending}
              className="w-full rounded-xl py-6 bg-linear-to-r from-indigo-500 to-purple-600 text-white font-bold shadow-md hover:shadow-lg transition-all"
            >
              {createListMutation.isPending ? 'Creating...' : 'Create List'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Modal */}
      <Dialog open={taskModalOpen} onOpenChange={(open) => {
        setTaskModalOpen(open);
        if (!open) {
          setEditingTask(null);
          resetNewTask();
        }
      }}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editingTask ? 'Edit Task' : 'Create Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label className="font-semibold text-slate-600">Title</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Task title"
                className="rounded-xl font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-slate-600">Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Add more details..."
                className="rounded-xl min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-semibold text-slate-600">Status</Label>
                <Select 
                  value={newTask.status} 
                  onValueChange={(v) => {
                    setNewTask({ 
                      ...newTask, 
                      status: v,
                      completed: v === 'done' 
                    })
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-slate-600">Due Date</Label>
                <Input
                  type="date"
                  value={newTask.due_date || ''}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <Separator className="bg-slate-100" />

            {/* Assign to Multiple Users */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 font-semibold text-slate-600">
                <Users className="w-4 h-4 text-indigo-500" />
                Assign To
              </Label>
              <div className="flex flex-wrap gap-2">
                {groups.find((g: any) => g.id === newTask.group_id)?.members?.map((email: string) => {
                  const group = groups.find((g: any) => g.id === newTask.group_id);
                  const isAssigned = newTask.assigned_to?.includes(email);
                  return (
                    <button
                      key={email}
                      type="button"
                      onClick={() => {
                        const assigned = newTask.assigned_to || [];
                        setNewTask({
                          ...newTask,
                          assigned_to: isAssigned 
                            ? assigned.filter(e => e !== email)
                            : [...assigned, email]
                        });
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                        isAssigned 
                          ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-200 shadow-sm' 
                          : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Avatar className="w-5 h-5 bg-linear-to-br from-indigo-400 to-purple-500">
                        <AvatarFallback className="bg-transparent text-white text-[8px]">
                          {getInitials(group?.member_names?.[email] || email)}
                        </AvatarFallback>
                      </Avatar>
                      {group?.member_names?.[email] || email}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator className="bg-slate-100" />

            {/* Dependencies */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 font-semibold text-slate-600">
                <Link2 className="w-4 h-4 text-indigo-500" />
                Depends On (Blockers)
              </Label>
              <Select 
                value="" 
                onValueChange={(taskId) => {
                  if (!newTask.depends_on?.includes(taskId)) {
                    setNewTask({
                      ...newTask,
                      depends_on: [...(newTask.depends_on || []), taskId]
                    });
                  }
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Add task dependency..." />
                </SelectTrigger>
                <SelectContent>
                  {allTasks
                    .filter(t => getId(t) !== (editingTask ? getId(editingTask) : '') && t.group_id === newTask.group_id && !t.parent_task_id)
                    .map(task => (
                      <SelectItem key={getId(task)} value={getId(task)}>
                        {task.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {newTask.depends_on && newTask.depends_on.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newTask.depends_on.map(depId => {
                    const depTask = allTasks.find(t => getId(t) === depId);
                    return (
                      <Badge key={depId} variant="secondary" className="rounded-full px-3 py-1 flex items-center gap-1.5 bg-slate-100 text-slate-700">
                        {depTask?.title || 'Unknown Task'}
                        <X 
                          className="w-3.5 h-3.5 cursor-pointer text-slate-400 hover:text-red-500 transition-colors" 
                          onClick={() => {
                            setNewTask({
                              ...newTask,
                              depends_on: newTask.depends_on?.filter(id => id !== depId) || []
                            });
                          }}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {editingTask && (
              <>
                <Separator className="bg-slate-100" />
                <SubtaskList
                  subtasks={getSubtasks(getId(editingTask)).map(t => ({
                    id: getId(t),
                    title: t.title,
                    completed: t.completed ?? false
                  }))}
                  onAddSubtask={(title: string) => handleAddSubtask(getId(editingTask), title)}
                  onToggleSubtask={handleToggleSubtask}
                  onDeleteSubtask={handleDeleteSubtask}
                />
              </>
            )}
            
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              {editingTask && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    deleteTaskMutation.mutate(getId(editingTask));
                    setTaskModalOpen(false);
                    setEditingTask(null);
                  }}
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                >
                  Delete
                </Button>
              )}
              <Button 
                onClick={() => createTaskMutation.mutate(newTask)}
                disabled={!newTask.title || createTaskMutation.isPending}
                className="flex-1 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-md hover:shadow-lg transition-all"
              >
                {createTaskMutation.isPending ? 'Saving...' : editingTask ? 'Save Changes' : 'Create Task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}