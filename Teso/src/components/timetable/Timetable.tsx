import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import type { Task } from '@/types/timetable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { useState, useRef, useEffect, useMemo } from 'react';

interface TimetableProps {
  selectedDate: Date;
  tasks: Task[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const COMPACT_HOUR_WIDTH = 60;
const EXPANDED_HOUR_WIDTH = 200;

const COLOR_MAP: Record<string, { bar: string; dot: string }> = {
  blue:   { bar: 'from-blue-500/20 to-blue-600/10 border-blue-400/60 text-blue-700 dark:text-blue-300',   dot: 'bg-blue-500' },
  red:    { bar: 'from-red-500/20 to-red-600/10 border-red-400/60 text-red-700 dark:text-red-300',         dot: 'bg-red-500' },
  green:  { bar: 'from-green-500/20 to-green-600/10 border-green-400/60 text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  yellow: { bar: 'from-yellow-500/20 to-yellow-600/10 border-yellow-400/60 text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
  purple: { bar: 'from-purple-500/20 to-purple-600/10 border-purple-400/60 text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  pink:   { bar: 'from-pink-500/20 to-pink-600/10 border-pink-400/60 text-pink-700 dark:text-pink-300',   dot: 'bg-pink-500' },
  orange: { bar: 'from-orange-500/20 to-orange-600/10 border-orange-400/60 text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  teal:   { bar: 'from-teal-500/20 to-teal-600/10 border-teal-400/60 text-teal-700 dark:text-teal-300',   dot: 'bg-teal-500' },
};

const PRIORITY_COLORS: Record<string, string> = {
  high:   'border-l-red-500',
  medium: 'border-l-yellow-500',
  low:    'border-l-blue-500',
};

export function Timetable({ selectedDate, tasks, onAddTask, onEditTask, onDeleteTask }: TimetableProps) {
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const hourWidths = useMemo(() => {
    return HOURS.map(hour => {
      const hasTask = tasks.some(task => {
        const [startH, startM] = task.startTime.split(':').map(Number);
        const [endH, endM] = task.endTime.split(':').map(Number);
        const taskStart = startH + startM / 60;
        const taskEnd = endH + endM / 60;
        return taskStart < hour + 1 && taskEnd > hour;
      });
      return hasTask ? EXPANDED_HOUR_WIDTH : COMPACT_HOUR_WIDTH;
    });
  }, [tasks]);

  const getHourPosition = (hour: number) =>
    hourWidths.slice(0, hour).reduce((sum, width) => sum + width, 0);

  const getPosition = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return getHourPosition(h) + (m / 60) * hourWidths[h];
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      if (tasks.length > 0) {
        const earliest = tasks.reduce((prev, curr) =>
          prev.startTime < curr.startTime ? prev : curr
        );
        const [h] = earliest.startTime.split(':').map(Number);
        scrollContainerRef.current.scrollLeft = Math.max(0, getHourPosition(h) - 20);
      } else {
        const hour = new Date().getHours();
        scrollContainerRef.current.scrollLeft = Math.max(0, getHourPosition(hour) - 20);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const getTaskWidth = (startTime: string, endTime: string) =>
    getPosition(endTime) - getPosition(startTime);

  const getTaskStyles = (task: Task) => {
    const color = task.color || 'blue';
    const colorEntry = COLOR_MAP[color] || COLOR_MAP['blue'];
    return `bg-gradient-to-r ${colorEntry.bar} border-l-4 ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS['low']}`;
  };

  const sortedTasks = [...tasks].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const totalWidth = hourWidths.reduce((sum, w) => sum + w, 0);

  const nowHour = new Date().getHours();
  const nowMin = new Date().getMinutes();
  const isToday =
    selectedDate.toDateString() === new Date().toDateString();
  const nowPosition = getHourPosition(nowHour) + (nowMin / 60) * hourWidths[nowHour];

  return (
    <div className="flex flex-col h-full w-full bg-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b border-border gap-3 bg-card">
        <div>
          <h2 className="text-foreground text-lg sm:text-xl font-semibold tracking-tight">
            {formatDate(selectedDate)}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm flex items-center gap-2 mt-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} scheduled
          </p>
        </div>
        <Button
          onClick={onAddTask}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all hover:shadow-lg hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Timeline Scroll Area */}
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden w-full touch-pan-x"
        ref={scrollContainerRef}
        style={{ scrollBehavior: 'smooth' }}
      >
        <div style={{ width: `${totalWidth}px`, minWidth: '100%' }}>
          {/* Hour Header */}
          <div className="sticky top-0 z-10 bg-card border-b border-border">
            <div className="flex">
              {HOURS.map(hour => (
                <div
                  key={hour}
                  className="border-r border-border/50 flex items-center justify-center transition-all duration-300 h-10 flex-shrink-0"
                  style={{ width: `${hourWidths[hour]}px` }}
                >
                  <span className={`text-xs font-medium ${hour === nowHour && isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Task rows or empty state */}
          <div className="relative">
            {sortedTasks.length === 0 ? (
              <div className="flex items-center justify-center text-muted-foreground h-64">
                <div className="text-center px-4">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                    <Clock className="w-7 h-7 opacity-40" />
                  </div>
                  <p className="font-semibold text-foreground">No tasks for this day</p>
                  <p className="text-sm mt-1 text-muted-foreground">Click "Add Task" to schedule something</p>
                </div>
              </div>
            ) : (
              <>
                {/* Grid background */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {HOURS.map(hour => (
                    <div
                      key={hour}
                      className="border-r border-border/30 h-full flex-shrink-0"
                      style={{ width: `${hourWidths[hour]}px` }}
                    />
                  ))}
                </div>

                {/* Current time indicator */}
                {isToday && (
                  <div
                    className="absolute top-0 bottom-0 z-20 pointer-events-none"
                    style={{ left: `${nowPosition}px` }}
                  >
                    <div className="w-0.5 h-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 absolute -top-1 -left-[4px]" />
                  </div>
                )}

                {/* Task bars */}
                <div className="py-3 space-y-2" style={{ minHeight: '200px' }}>
                  {sortedTasks.map(task => {
                    const left = getPosition(task.startTime);
                    const width = Math.max(getTaskWidth(task.startTime, task.endTime), 60);

                    return (
                      <div
                        key={task.id}
                        className="relative"
                        style={{ height: '72px' }}
                      >
                        {/* Row grid */}
                        <div className="absolute inset-0 flex pointer-events-none opacity-0">
                          {HOURS.map(hour => (
                            <div
                              key={hour}
                              className="border-r border-border/20 h-full flex-shrink-0"
                              style={{ width: `${hourWidths[hour]}px` }}
                            />
                          ))}
                        </div>

                        {/* Task card */}
                        <div
                          className={`absolute top-1 bottom-1 rounded-xl border-2 border-border/40 p-2 sm:p-3 ${getTaskStyles(task)} cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-200 backdrop-blur-sm group`}
                          style={{ left: `${left}px`, width: `${width}px`, minWidth: '60px' }}
                          onClick={() => onEditTask(task)}
                        >
                          <div className="flex items-start justify-between gap-1 h-full">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="font-semibold text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                                {task.title}
                              </div>
                              {width > 120 && (
                                <div className="text-xs mt-0.5 opacity-70 whitespace-nowrap overflow-hidden text-ellipsis">
                                  {task.startTime} – {task.endTime}
                                </div>
                              )}
                              {task.description && width > 180 && (
                                <div className="hidden sm:block text-xs mt-1 opacity-60 line-clamp-1">
                                  {task.description}
                                </div>
                              )}
                            </div>
                            {width > 90 && (
                              <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={e => { e.stopPropagation(); onEditTask(task); }}
                                  className="p-1 hover:bg-background/40 rounded transition-all"
                                  title="Edit"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); setDeleteTaskId(task.id); }}
                                  className="p-1 hover:bg-red-500/20 rounded transition-all text-red-600 dark:text-red-400"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent className="bg-card border border-border shadow-2xl w-[90vw] max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                <Trash2 className="w-4 h-4" />
              </span>
              <span className="text-foreground">Delete Task?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground mt-2">
              This will permanently remove the selected task. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="sm:mt-0 border-border text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTaskId) {
                  onDeleteTask(deleteTaskId);
                  setDeleteTaskId(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0"
            >
              Delete Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}