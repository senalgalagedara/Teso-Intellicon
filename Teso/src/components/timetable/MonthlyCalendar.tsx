import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import type { Task } from '@/types/timetable';
import { useState } from 'react';
import { toLocalDateString } from '@/lib/utils';

interface MonthlyCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  tasks: Task[];
}

export function MonthlyCalendar({ selectedDate, onDateSelect, tasks }: MonthlyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return {
      daysInMonth: lastDay.getDate(),
      startingDayOfWeek: firstDay.getDay(),
    };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  const previousMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const getTasksForDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = toLocalDateString(date);
    return tasks.filter(task => task.date === dateStr);
  };

  const getTopPriorityTasks = (day: number) => {
    const dayTasks = getTasksForDate(day);
    const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
    return dayTasks
      .slice()
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 3);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelectedDate = (day: number) =>
    day === selectedDate.getDate() &&
    currentMonth.getMonth() === selectedDate.getMonth() &&
    currentMonth.getFullYear() === selectedDate.getFullYear();

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onDateSelect(newDate);
  };

  const getPriorityDot = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':   return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low':    return 'bg-blue-500';
    }
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="flex flex-col p-4 bg-card">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">{monthName}</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            onClick={previousMonth}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            onClick={nextMonth}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day, idx) => (
          <div key={idx} className="text-center text-[10px] text-muted-foreground font-semibold py-1 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = toLocalDateString(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
          );
          const dayTasks = getTasksForDate(day);
          const topPriorityTasks = getTopPriorityTasks(day);
          const isHovered = hoveredDate === dateStr;
          const selected = isSelectedDate(day);
          const today = isToday(day);

          return (
            <div
              key={day}
              className="relative aspect-square"
              onMouseEnter={() => setHoveredDate(dateStr)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              <button
                onClick={() => handleDayClick(day)}
                className={`w-full h-full rounded-lg transition-all duration-200 relative flex flex-col items-center justify-center gap-0.5 hover:scale-105 ${
                  selected
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                    : today
                    ? 'bg-primary/10 text-primary border border-primary/30 font-semibold'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <span className="text-xs font-medium leading-none">{day}</span>
                {dayTasks.length > 0 && (
                  <div className="flex gap-0.5 justify-center">
                    {dayTasks.slice(0, 3).map((task, idx) => (
                      <div
                        key={idx}
                        className={`w-1 h-1 rounded-full ${selected ? 'bg-primary-foreground/70' : getPriorityDot(task.priority)}`}
                      />
                    ))}
                  </div>
                )}
              </button>

              {/* Hover tooltip */}
              {isHovered && topPriorityTasks.length > 0 && (
                <div className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs rounded-xl p-3 shadow-2xl border border-border whitespace-nowrap min-w-48 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="space-y-2">
                    {topPriorityTasks.map(task => (
                      <div key={task.id} className="flex items-start gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${getPriorityDot(task.priority)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{task.title}</div>
                          <div className="text-muted-foreground mt-0.5">{task.startTime} – {task.endTime}</div>
                        </div>
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-muted-foreground text-center pt-1 border-t border-border mt-2">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                  {/* Arrow */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-border" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-b-popover mt-px" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground space-y-1.5">
          {[
            { label: 'High Priority', cls: 'bg-red-500' },
            { label: 'Medium Priority', cls: 'bg-amber-500' },
            { label: 'Low Priority', cls: 'bg-blue-500' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${item.cls}`} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
