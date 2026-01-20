import { useState, useEffect } from 'react';
import { mockApiClient } from '@/lib/mockApiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { 
  Plus, MoreVertical, Trash2, CheckSquare, 
  Clock, CheckCircle, X, GripVertical, Users, Link2
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
import SubtaskList from '../components/tasks/SubtaskList';

// --- Interfaces ---

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface Group {
  id: string;
  name: string;
  members: string[];
  owner: string;
  member_names?: Record<string, string>;
}

interface TaskList {
  id: string;
  name: string;
  group_id: string;
  order: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  group_id: string;
  list_name: string;
  status: string;
  label?: string;
  due_date?: string;
  assigned_to?: string[];
  depends_on?: string[];
  parent_task_id?: string;
  completed?: boolean;
}

interface NewTaskState {
  title: string;
  description: string;
  group_id: string;
  list_name: string;
  status: string;
  label: string;
  due_date: string;
  assigned_to: string[];
  depends_on: string[];
}

export default function Tasks() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newListName, setNewListName] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  
  const [newTask, setNewTask] = useState<NewTaskState>({
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

  const loadUser = async () => {
    try {
      const userData = await mockApiClient.auth.me();
      setUser(userData);
    } catch (e) {
      mockApiClient.auth.redirectToLogin();
    }
  };

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups', user?.email],
    queryFn: async () => {
      const allGroups = await mockApiClient.entities.Group.list();
      return allGroups.filter((g: Group) => g.members?.includes(user?.email || '') || g.owner === user?.email);
    },
    enabled: !!user?.email,
  });

  const { data: taskLists = [] } = useQuery<TaskList[]>({
    queryKey: ['taskLists', groups, selectedGroup],
    queryFn: async () => {
      const groupIds = selectedGroup === 'all' ? groups.map(g => g.id) : [selectedGroup];
      const allLists = await mockApiClient.entities.TaskList.list();
      return allLists.filter((l: TaskList) => groupIds.includes(l.group_id)).sort((a: TaskList, b: TaskList) => (a.order || 0) - (b.order || 0));
    },
    enabled: groups.length > 0,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', groups, selectedGroup],
    queryFn: async () => {
      const groupIds = selectedGroup === 'all' ? groups.map(g => g.id) : [selectedGroup];
      const allTasks = await mockApiClient.entities.Task.list();
      return allTasks.filter((t: Task) => groupIds.includes(t.group_id) && !t.parent_task_id); 
    },
    enabled: groups.length > 0,
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ['allTasks', groups, selectedGroup],
    queryFn: async () => {
      const groupIds = selectedGroup === 'all' ? groups.map(g => g.id) : [selectedGroup];
      const allTasks = await mockApiClient.entities.Task.list();
      return allTasks.filter((t: Task) => groupIds.includes(t.group_id));
    },
    enabled: groups.length > 0,
  });

  const createListMutation = useMutation({
    mutationFn: async (name: string) => {
      const groupId = selectedGroup !== 'all' ? selectedGroup : groups[0]?.id;
      await mockApiClient.entities.TaskList.create({
        name,
        group_id: groupId,
        order: taskLists.length
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLists'] });
      setListModalOpen(false);
      setNewListName('');
      toast.success('List created!');
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (listId: string) => {
      const listTasks = tasks.filter(t => taskLists.find(l => l.id === listId)?.name === t.list_name);
      for (const task of listTasks) {
        await mockApiClient.entities.Task.delete(task.id);
      }
      await mockApiClient.entities.TaskList.delete(listId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLists'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('List deleted');
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Partial<Task>) => {
      if (editingTask) {
        return await mockApiClient.entities.Task.update(editingTask.id, taskData);
      }
      return await mockApiClient.entities.Task.create(taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setTaskModalOpen(false);
      setEditingTask(null);
      resetNewTask();
      toast.success(editingTask ? 'Task updated!' : 'Task created!');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      await mockApiClient.entities.Task.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => mockApiClient.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
      const newLists = Array.from(taskLists);
      const [removed] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, removed);
      
      newLists.forEach((list, index) => {
        mockApiClient.entities.TaskList.update(list.id, { order: index });
      });
      queryClient.invalidateQueries({ queryKey: ['taskLists'] });
    } else {
      const taskId = result.draggableId;
      const destListName = destination.droppableId;
      
      updateTaskMutation.mutate({
        id: taskId,
        data: { list_name: destListName }
      });
    }
  };

  const openAddTask = (listName: string) => {
    resetNewTask();
    setNewTask(prev => ({ 
      ...prev, 
      list_name: listName,
      group_id: selectedGroup !== 'all' ? selectedGroup : (groups[0]?.id || '')
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
      depends_on: task.depends_on || []
    });
    setTaskModalOpen(true);
  };

  const getSubtasks = (parentId: string) => {
    return allTasks.filter(t => t.parent_task_id === parentId);
  };

  const handleAddSubtask = async (parentId: string, title: string) => {
    const parentTask = allTasks.find(t => t.id === parentId);
    if (!parentTask) return;
    
    await mockApiClient.entities.Task.create({
      title,
      group_id: parentTask.group_id,
      list_name: parentTask.list_name,
      parent_task_id: parentId,
      status: 'todo',
      completed: false
    });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    const subtask = allTasks.find(t => t.id === subtaskId);
    if (!subtask) return;
    
    await updateTaskMutation.mutateAsync({
      id: subtaskId,
      data: { completed: !subtask.completed }
    });
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    await deleteTaskMutation.mutateAsync(subtaskId);
    queryClient.invalidateQueries({ queryKey: ['allTasks'] });
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const canStartTask = (task: Task) => {
    if (!task.depends_on || task.depends_on.length === 0) return true;
    return task.depends_on.every(depId => {
      const depTask = allTasks.find(t => t.id === depId);
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
    
    return filtered;
  };

  const groupedLists = selectedGroup === 'all' 
    ? groups.map(group => ({
        group,
        lists: taskLists.filter(l => l.group_id === group.id)
      })).filter(g => g.lists.length > 0)
    : [{ group: groups.find(g => g.id === selectedGroup), lists: taskLists }];

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
              {groups.map(group => (
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
              {selectedGroup !== 'all' && groups.find(g => g.id === selectedGroup)?.members?.map((email: string) => {
                const group = groups.find(g => g.id === selectedGroup);
                return (
                  <SelectItem key={email} value={email}>
                    {group?.member_names?.[email] || email}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={() => setListModalOpen(true)}
            variant="outline"
            className="rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" /> Add List
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        {groupedLists.map(({ group, lists }) => (
          <div key={group?.id || 'all'} className="mb-8">
            {selectedGroup === 'all' && (
              <h2 className="text-lg font-semibold text-slate-700 mb-4">{group?.name}</h2>
            )}
            <Droppable droppableId={group?.id || 'all'} type="list" direction="horizontal">
              {(provided) => (
                <div 
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex gap-4 overflow-x-auto pb-4 min-h-125"
                >
                  {lists.map((list, index) => (
                    <Draggable key={list.id} draggableId={list.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`shrink-0 w-80 ${snapshot.isDragging ? 'opacity-90' : ''}`}
                        >
                          <Card className="border-0 shadow-lg bg-slate-50/80 backdrop-blur-sm h-full">
                            <CardHeader className="pb-2" {...provided.dragHandleProps}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="w-4 h-4 text-slate-400" />
                                  <CardTitle className="text-base font-semibold">{list.name}</CardTitle>
                                  <Badge variant="secondary" className="rounded-full">
                                    {getTasksByList(list.name, group?.id).length}
                                  </Badge>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-xl">
                                    <DropdownMenuItem onClick={() => openAddTask(list.name)}>
                                      <Plus className="w-4 h-4 mr-2" /> Add Task
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => deleteListMutation.mutate(list.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" /> Delete List
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <Droppable droppableId={list.name} type="task">
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`space-y-2 min-h-75 p-2 rounded-xl transition-colors ${
                                      snapshot.isDraggingOver ? 'bg-indigo-50' : ''
                                    }`}
                                  >
                                    <AnimatePresence>
                                      {getTasksByList(list.name, group?.id).map((task, taskIndex) => (
                                        <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
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
                                                  className={`p-3 rounded-xl bg-white shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${
                                                    snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                                  } ${task.completed ? 'opacity-60' : ''}`}
                                                  onClick={() => openEditTask(task)}
                                                >
                                                  <div className="flex items-start gap-3">
                                                    <Checkbox
                                                      checked={task.completed}
                                                      onCheckedChange={(checked) => {
                                                        updateTaskMutation.mutate({
                                                          id: task.id,
                                                          data: { completed: !!checked }
                                                        });
                                                      }}
                                                      onClick={(e) => e.stopPropagation()}
                                                      className="mt-0.5"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                      <p className={`font-medium text-sm ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                                        {task.title}
                                                      </p>
                                                      {task.description && (
                                                       <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                         {task.description}
                                                       </p>
                                                      )}
                                                      <div className="flex flex-wrap items-center gap-2 mt-2">
                                                       <Badge 
                                                         variant="secondary" 
                                                         className={`text-xs rounded-full ${
                                                           task.status === 'done' ? 'bg-green-100 text-green-700 border-green-200' :
                                                           task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                           'bg-slate-100 text-slate-700 border-slate-200'
                                                         } border`}
                                                       >
                                                         {task.status === 'done' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                         {task.status === 'in_progress' && <Clock className="w-3 h-3 mr-1" />}
                                                         {task.status?.replace('_', ' ') || 'todo'}
                                                       </Badge>
                                                       {task.due_date && (
                                                         <span className="text-xs text-slate-500">
                                                           {task.due_date}
                                                         </span>
                                                       )}
                                                       {task.assigned_to && task.assigned_to.length > 0 && (
                                                         <div className="flex -space-x-2">
                                                           {task.assigned_to.slice(0, 3).map((email) => {
                                                             const group = groups.find(g => g.id === task.group_id);
                                                             return (
                                                               <Avatar key={email} className="w-5 h-5 border-2 border-white bg-linear-to-br from-indigo-400 to-purple-500">
                                                                 <AvatarFallback className="bg-transparent text-white text-[8px]">
                                                                   {getInitials(group?.member_names?.[email] || email)}
                                                                 </AvatarFallback>
                                                               </Avatar>
                                                             );
                                                           })}
                                                           {task.assigned_to.length > 3 && (
                                                             <div className="w-5 h-5 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center">
                                                               <span className="text-[8px] text-slate-600">+{task.assigned_to.length - 3}</span>
                                                             </div>
                                                           )}
                                                         </div>
                                                       )}
                                                       {getSubtasks(task.id).length > 0 && (
                                                         <span className="text-xs text-slate-500 flex items-center gap-1">
                                                           <CheckSquare className="w-3 h-3" />
                                                           {getSubtasks(task.id).filter(s => s.completed).length}/{getSubtasks(task.id).length}
                                                         </span>
                                                       )}
                                                       {task.depends_on && task.depends_on.length > 0 && (
                                                         <Link2 className={`w-3 h-3 ${canStartTask(task) ? 'text-green-500' : 'text-amber-500'}`} />
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
                              <Button
                                variant="ghost"
                                className="w-full mt-2 rounded-xl text-slate-500 hover:text-slate-700"
                                onClick={() => openAddTask(list.name)}
                              >
                                <Plus className="w-4 h-4 mr-2" /> Add Task
                              </Button>
                            </CardContent>
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
                      className="w-full h-14 rounded-2xl border-dashed border-2 text-slate-500 hover:text-slate-700 hover:border-slate-400"
                      onClick={() => setListModalOpen(true)}
                    >
                      <Plus className="w-5 h-5 mr-2" /> Add List
                    </Button>
                  </div>
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </DragDropContext>

      {/* Create List Modal */}
      <Dialog open={listModalOpen} onOpenChange={setListModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>List Name</Label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g., To Do, In Progress, Done"
                className="rounded-xl"
              />
            </div>
            {selectedGroup === 'all' && (
              <p className="text-sm text-slate-500">
                List will be created in: {groups[0]?.name || 'No group selected'}
              </p>
            )}
            <Button 
              onClick={() => createListMutation.mutate(newListName)}
              disabled={!newListName || createListMutation.isPending}
              className="w-full rounded-full bg-linear-to-r from-indigo-500 to-purple-600"
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
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Task title"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Task description"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newTask.status} onValueChange={(v) => setNewTask({ ...newTask, status: v })}>
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
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <Separator />

            {/* Assign to Multiple Users */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                Assign To
              </Label>
              <div className="flex flex-wrap gap-2">
                {groups.find(g => g.id === newTask.group_id)?.members?.map((email: string) => {
                  const group = groups.find(g => g.id === newTask.group_id);
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
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                        isAssigned 
                          ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300' 
                          : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:border-slate-300'
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

            <Separator />

            {/* Dependencies */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-indigo-500" />
                Depends On
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
                  <SelectValue placeholder="Add dependency..." />
                </SelectTrigger>
                <SelectContent>
                  {allTasks
                    .filter(t => t.id !== editingTask?.id && t.group_id === newTask.group_id && !t.parent_task_id)
                    .map(task => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {newTask.depends_on && newTask.depends_on.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newTask.depends_on.map(depId => {
                    const depTask = allTasks.find(t => t.id === depId);
                    return (
                      <Badge key={depId} variant="secondary" className="rounded-full flex items-center gap-1">
                        {depTask?.title || 'Unknown'}
                        <X 
                          className="w-3 h-3 cursor-pointer hover:text-red-600" 
                          onClick={() => {
                            setNewTask({
                              ...newTask,
                              depends_on: newTask.depends_on.filter(id => id !== depId)
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
                <Separator />
                <SubtaskList
                  subtasks={getSubtasks(editingTask.id).map(t => ({
                    id: t.id,
                    title: t.title,
                    completed: t.completed ?? false
                  }))}
                  onAddSubtask={(title: string) => handleAddSubtask(editingTask.id, title)}
                  onToggleSubtask={handleToggleSubtask}
                  onDeleteSubtask={handleDeleteSubtask}
                />
              </>
            )}
            <div className="flex gap-2 pt-2">
              {editingTask && (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    deleteTaskMutation.mutate(editingTask.id);
                    setTaskModalOpen(false);
                    setEditingTask(null);
                  }}
                  className="rounded-full"
                >
                  Delete
                </Button>
              )}
              <Button 
                onClick={() => createTaskMutation.mutate(newTask)}
                disabled={!newTask.title || createTaskMutation.isPending}
                className="flex-1 rounded-full bg-linear-to-r from-indigo-500 to-purple-600"
              >
                {createTaskMutation.isPending ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}