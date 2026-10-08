"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { Task } from '@/types/timetable';
import { Video, Users, ClipboardList, VideoIcon } from 'lucide-react';
import { toLocalDateString } from '@/lib/utils';

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id'>) => void;
  task: Task | null;
  selectedDate: Date;
}

const COLORS = [
  { id: 'blue',   bg: 'bg-blue-500',   ring: 'ring-blue-500' },
  { id: 'red',    bg: 'bg-red-500',    ring: 'ring-red-500' },
  { id: 'green',  bg: 'bg-green-500',  ring: 'ring-green-500' },
  { id: 'yellow', bg: 'bg-yellow-500', ring: 'ring-yellow-500' },
  { id: 'purple', bg: 'bg-purple-500', ring: 'ring-purple-500' },
  { id: 'pink',   bg: 'bg-pink-500',   ring: 'ring-pink-500' },
  { id: 'orange', bg: 'bg-orange-500', ring: 'ring-orange-500' },
  { id: 'teal',   bg: 'bg-teal-500',   ring: 'ring-teal-500' },
];

type FormData = {
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  priority: 'low' | 'medium' | 'high';
  color: string;
  description: string;
  zoomLink: string;
  teamsLink: string;
  meetLink: string;
};

export function TaskDialog({ isOpen, onClose, onSave, task, selectedDate }: TaskDialogProps) {
  const [mode, setMode] = useState<'task' | 'meeting'>('task');
  const [formData, setFormData] = useState<FormData>({
    title: '',
    startTime: '',
    endTime: '',
    date: toLocalDateString(selectedDate),
    priority: 'medium',
    color: 'blue',
    description: '',
    zoomLink: '',
    teamsLink: '',
    meetLink: '',
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title:       task.title || '',
        startTime:   task.startTime || '',
        endTime:     task.endTime || '',
        date:        task.date || toLocalDateString(selectedDate),
        priority:    task.priority || 'medium',
        color:       task.color || 'blue',
        description: task.description || '',
        zoomLink:    task.zoomLink || '',
        teamsLink:   task.teamsLink || '',
        meetLink:    task.meetLink || '',
      });
      setMode(task.zoomLink || task.meetLink || task.teamsLink ? 'meeting' : 'task');
    } else {
      setFormData({
        title: '',
        startTime: '',
        endTime: '',
        date: toLocalDateString(selectedDate),
        priority: 'medium',
        color: 'blue',
        description: '',
        zoomLink: '',
        teamsLink: '',
        meetLink: '',
      });
      setMode('task');
    }
  }, [task, selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, date: formData.date || toLocalDateString(selectedDate) };
    onSave(payload);
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isEditing = !!task;
  const dialogTitle = isEditing
    ? mode === 'task' ? 'Edit Task' : 'Edit Meeting'
    : mode === 'task' ? 'New Task' : 'New Meeting';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-[480px] max-h-[92vh] overflow-y-auto bg-card border border-border shadow-2xl rounded-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold text-foreground">
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4 pb-2">
          {/* Mode Toggle */}
          <div className="flex gap-1.5 p-1 bg-muted rounded-xl mb-5">
            <button
              type="button"
              onClick={() => setMode('task')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'task'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Task
            </button>
            <button
              type="button"
              onClick={() => setMode('meeting')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'meeting'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <VideoIcon className="w-4 h-4" />
              Meeting
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm font-medium text-foreground">
                {mode === 'task' ? 'Task Title' : 'Meeting Title'} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => handleChange('title', e.target.value)}
                placeholder={mode === 'task' ? 'e.g. Study session' : 'e.g. Team standup'}
                required
                className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Time fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="text-sm font-medium text-foreground">
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={e => handleChange('startTime', e.target.value)}
                  required
                  className="bg-background border-input text-foreground [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endTime" className="text-sm font-medium text-foreground">
                  End Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={e => handleChange('endTime', e.target.value)}
                  required
                  className="bg-background border-input text-foreground [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-sm font-medium text-foreground">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={e => handleChange('date', e.target.value)}
                className="bg-background border-input text-foreground [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            {/* Task-specific fields */}
            {mode === 'task' && (
              <>
                {/* Priority */}
                <div className="space-y-1.5">
                  <Label htmlFor="priority" className="text-sm font-medium text-foreground">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={value => handleChange('priority', value as 'low' | 'medium' | 'high')}
                  >
                    <SelectTrigger className="bg-background border-input text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          High Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          Medium Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          Low Priority
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Color picker */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">Color Label</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleChange('color', c.id)}
                        className={`w-8 h-8 rounded-full ${c.bg} transition-all hover:scale-110 ${
                          formData.color === c.id
                            ? `ring-2 ring-offset-2 ring-offset-card ${c.ring}`
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        title={c.id}
                      />
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-sm font-medium text-foreground">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e => handleChange('description', e.target.value)}
                    placeholder="Add notes or details..."
                    rows={3}
                    className="bg-background border-input text-foreground placeholder:text-muted-foreground resize-none"
                  />
                </div>
              </>
            )}

            {/* Meeting-specific fields */}
            {mode === 'meeting' && (
              <div className="space-y-3">
                {[
                  { field: 'meetLink' as const,  label: 'Google Meet Link',     icon: <Users className="w-4 h-4" />,  placeholder: 'https://meet.google.com/...' },
                  { field: 'zoomLink' as const,   label: 'Zoom Link',            icon: <VideoIcon className="w-4 h-4" />, placeholder: 'https://zoom.us/j/...' },
                  { field: 'teamsLink' as const,  label: 'Microsoft Teams Link', icon: <Video className="w-4 h-4" />,  placeholder: 'https://teams.microsoft.com/...' },
                ].map(({ field, label, icon, placeholder }) => (
                  <div key={field} className="space-y-1.5">
                    <Label htmlFor={field} className="text-sm font-medium text-foreground">{label}</Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {icon}
                      </div>
                      <Input
                        id={field}
                        value={formData[field]}
                        onChange={e => handleChange(field, e.target.value)}
                        placeholder={placeholder}
                        className="pl-9 bg-background border-input text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                ))}

                <div className="space-y-1.5">
                  <Label htmlFor="meetingDesc" className="text-sm font-medium text-foreground">Description</Label>
                  <Textarea
                    id="meetingDesc"
                    value={formData.description}
                    onChange={e => handleChange('description', e.target.value)}
                    placeholder="Agenda or notes..."
                    rows={3}
                    className="bg-background border-input text-foreground placeholder:text-muted-foreground resize-none"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 pb-2 border-t border-border flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isEditing ? 'Save Changes' : 'Add ' + (mode === 'task' ? 'Task' : 'Meeting')}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}