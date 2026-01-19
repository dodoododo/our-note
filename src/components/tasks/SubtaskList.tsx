import { useState } from 'react';
import { Plus, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from 'framer-motion';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface SubtaskListProps {
  subtasks?: Subtask[];
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (subtaskId: string) => void;
  onDeleteSubtask: (subtaskId: string) => void;
}

export default function SubtaskList({ subtasks = [], onAddSubtask, onToggleSubtask, onDeleteSubtask }: SubtaskListProps) {
  const [newSubtask, setNewSubtask] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newSubtask.trim()) {
      onAddSubtask(newSubtask.trim());
      setNewSubtask('');
      setIsAdding(false);
    }
  };

  const completedCount = subtasks.filter(s => s.completed).length;
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          Subtasks ({completedCount}/{subtasks.length})
        </span>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 text-xs rounded-full"
          >
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        )}
      </div>

      {subtasks.length > 0 && (
        <Progress value={progress} className="h-1.5" />
      )}

      <AnimatePresence>
        {subtasks.map((subtask) => (
          <motion.div
            key={subtask.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-2 group"
          >
            <button
              onClick={() => onToggleSubtask(subtask.id)}
              className="flex-shrink-0"
            >
              {subtask.completed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4 text-slate-400" />
              )}
            </button>
            <span className={`text-sm flex-1 ${subtask.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
              {subtask.title}
            </span>
            <button
              onClick={() => onDeleteSubtask(subtask.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {isAdding && (
        <div className="flex gap-2">
          <Input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Subtask title..."
            className="h-8 text-sm rounded-lg"
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleAdd}
            className="h-8 rounded-lg"
          >
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAdding(false);
              setNewSubtask('');
            }}
            className="h-8 rounded-lg"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}