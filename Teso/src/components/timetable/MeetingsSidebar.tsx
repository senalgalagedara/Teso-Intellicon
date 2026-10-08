import type { ReactNode } from 'react';
import { Video, Users, ExternalLink, X, CalendarClock, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '../ui/button';
import type { Task } from '@/types/timetable';
import { toLocalDateString } from '@/lib/utils';

interface MeetingsSidebarProps {
  tasks: Task[];
  isOpen: boolean;
  onToggle: () => void;
  onEditTask: (task: Task) => void;
}

export function MeetingsSidebar({ tasks, isOpen, onToggle, onEditTask }: MeetingsSidebarProps) {
  const today = toLocalDateString(new Date());
  const now = new Date();

  const meetingTasks = tasks.filter(
    task => (task.zoomLink || task.teamsLink || task.meetLink) && task.date === today
  );

  const openMeetingLink = (link: string) => window.open(link, '_blank');

  const getMeetingPlatform = (task: Task) => {
    if (task.zoomLink)  return { label: 'Join Zoom',         icon: <Video className="w-4 h-4" />,  link: task.zoomLink,  style: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-400/30 text-blue-600 dark:text-blue-400' };
    if (task.meetLink)  return { label: 'Join Google Meet',  icon: <Users className="w-4 h-4" />,  link: task.meetLink,  style: 'bg-green-500/10 hover:bg-green-500/20 border-green-400/30 text-green-600 dark:text-green-400' };
    if (task.teamsLink) return { label: 'Join Teams',        icon: <Video className="w-4 h-4" />,  link: task.teamsLink, style: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-400/30 text-purple-600 dark:text-purple-400' };
    return null;
  };

  const isUpcoming = (task: Task) => {
    const [h, m] = task.startTime.split(':').map(Number);
    const taskStart = new Date();
    taskStart.setHours(h, m, 0, 0);
    const diff = (taskStart.getTime() - now.getTime()) / 60000; // minutes
    return diff >= 0 && diff <= 60;
  };

  const isOngoing = (task: Task) => {
    const [sh, sm] = task.startTime.split(':').map(Number);
    const [eh, em] = task.endTime.split(':').map(Number);
    const start = new Date(); start.setHours(sh, sm, 0, 0);
    const end = new Date();   end.setHours(eh, em, 0, 0);
    return now >= start && now <= end;
  };

  return (
    <>
      {/* Desktop Toggle Button */}
      <button
        onClick={onToggle}
        className="hidden lg:flex fixed top-1/2 -translate-y-1/2 bg-card border border-border rounded-l-xl p-2.5 shadow-lg hover:bg-accent transition-all z-40"
        style={{ right: isOpen ? '320px' : '0' }}
        aria-label="Toggle meetings sidebar"
      >
        {isOpen
          ? <ChevronRight className="w-4 h-4 text-muted-foreground" />
          : <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        }
      </button>

      {/* Sidebar Drawer */}
      <div
        className={`fixed right-0 top-0 h-full bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-in-out z-50 w-full sm:w-[320px] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarClock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Today's Meetings</h2>
                <p className="text-xs text-muted-foreground">{meetingTasks.length} meeting{meetingTasks.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="lg:hidden text-muted-foreground hover:text-foreground h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Meeting list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {meetingTasks.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                  <Video className="w-7 h-7 opacity-30" />
                </div>
                <p className="font-medium text-foreground">No meetings today</p>
                <p className="text-sm mt-1">Add a task with a meeting link to see it here</p>
              </div>
            ) : (
              meetingTasks.map(task => {
                const platforms: { label: string; icon: ReactNode; link: string; style: string }[] = [];
                if (task.zoomLink)  platforms.push({ label: 'Join Zoom',        icon: <Video className="w-4 h-4" />, link: task.zoomLink,  style: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-400/30 text-blue-600 dark:text-blue-400' });
                if (task.meetLink)  platforms.push({ label: 'Join Google Meet', icon: <Users className="w-4 h-4" />, link: task.meetLink,  style: 'bg-green-500/10 hover:bg-green-500/20 border-green-400/30 text-green-600 dark:text-green-400' });
                if (task.teamsLink) platforms.push({ label: 'Join Teams',       icon: <Video className="w-4 h-4" />, link: task.teamsLink, style: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-400/30 text-purple-600 dark:text-purple-400' });

                const ongoing = isOngoing(task);
                const upcoming = isUpcoming(task);

                return (
                  <div
                    key={task.id}
                    className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">{task.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{task.startTime} – {task.endTime}</p>
                      </div>
                      {ongoing && (
                        <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-400/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          Live
                        </span>
                      )}
                      {!ongoing && upcoming && (
                        <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/30">
                          Soon
                        </span>
                      )}
                    </div>

                    {/* Platform join buttons */}
                    <div className="space-y-2">
                      {platforms.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => openMeetingLink(p.link)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${p.style}`}
                        >
                          {p.icon}
                          <span className="flex-1 text-left">{p.label}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </button>
                      ))}
                    </div>

                    {/* Edit button */}
                    <button
                      onClick={() => onEditTask(task)}
                      className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-lg hover:bg-accent"
                    >
                      Edit details
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}