"use client";

import { useState, useEffect } from 'react';
import { Timetable } from '@/components/timetable/Timetable';
import { MonthlyCalendar } from '@/components/timetable/MonthlyCalendar';
import { TaskDialog } from '@/components/timetable/TaskDialog';
import { MeetingsSidebar } from '@/components/timetable/MeetingsSidebar';
import type { Task } from "@/types/timetable";
import { toLocalDateString } from '@/lib/utils';
import { Calendar as CalendarIcon, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TimetablePage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobileCalendarOpen, setIsMobileCalendarOpen] = useState(false);

    // Load tasks from API on mount
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/timetable/tasks');
                if (res.ok) {
                    const data = await res.json();
                    setTasks(data);
                }
            } catch (e) {
                console.error('Failed to load tasks', e);
            }
        })();
    }, []);

    const addTask = async (task: Omit<Task, 'id'>) => {
        const res = await fetch('/api/timetable/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task),
        });
        if (res.ok) {
            const created = await res.json();
            setTasks(prev => [...prev, created]);
        }
    };

    const updateTask = async (id: string, updatedTask: Omit<Task, 'id'>) => {
        const res = await fetch(`/api/timetable/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedTask),
        });
        if (res.ok) {
            const updated = await res.json();
            setTasks(prev => prev.map(t => t.id === id ? updated : t));
        }
    };

    const deleteTask = async (id: string) => {
        const res = await fetch(`/api/timetable/tasks/${id}`, { method: 'DELETE' });
        if (res.ok) {
            setTasks(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingTask(null);
    };

    const handleSaveTask = (taskData: Omit<Task, 'id'>) => {
        if (editingTask) {
            updateTask(editingTask.id, taskData);
        } else {
            addTask(taskData);
        }
        handleCloseDialog();
    };

    const selectedDateStr = toLocalDateString(selectedDate);
    const tasksForSelectedDate = tasks.filter(task => task.date === selectedDateStr);

    return (
        <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">

            {/* Mobile Controls Header */}
            <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md z-20">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMobileCalendarOpen(!isMobileCalendarOpen)}
                    className="text-foreground gap-2"
                >
                    {isMobileCalendarOpen
                        ? <><X className="w-4 h-4" /> Close</>
                        : <><CalendarIcon className="w-4 h-4" /> Calendar</>
                    }
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="text-foreground"
                >
                    <Menu className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Main content area */}
                <div className="flex-1 flex flex-col overflow-hidden w-full">
                    <div className="flex flex-col lg:flex-row gap-4 p-4 lg:p-5 flex-1 overflow-hidden relative">

                        {/* Left side - Timetable */}
                        <div className="flex-1 bg-card rounded-2xl shadow-sm border border-border overflow-hidden flex flex-col h-full w-full">
                            <Timetable
                                selectedDate={selectedDate}
                                tasks={tasksForSelectedDate}
                                onAddTask={() => setIsDialogOpen(true)}
                                onEditTask={handleEditTask}
                                onDeleteTask={deleteTask}
                            />
                        </div>

                        {/* Right side - Calendar (Desktop) */}
                        <div className="hidden lg:flex w-72 flex-col gap-4">
                            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                                <MonthlyCalendar
                                    selectedDate={selectedDate}
                                    onDateSelect={setSelectedDate}
                                    tasks={tasks}
                                />
                            </div>
                        </div>

                        {/* Calendar Overlay (Mobile) */}
                        {isMobileCalendarOpen && (
                            <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-xl p-4 lg:hidden flex flex-col animate-in fade-in duration-200">
                                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
                                    <MonthlyCalendar
                                        selectedDate={selectedDate}
                                        onDateSelect={date => {
                                            setSelectedDate(date);
                                            setIsMobileCalendarOpen(false);
                                        }}
                                        tasks={tasks}
                                    />
                                </div>
                                <Button
                                    className="mt-4 w-full"
                                    variant="outline"
                                    onClick={() => setIsMobileCalendarOpen(false)}
                                >
                                    Back to Timetable
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Meetings Sidebar */}
                <MeetingsSidebar
                    tasks={tasks}
                    isOpen={isSidebarOpen}
                    onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                    onEditTask={handleEditTask}
                />
            </div>

            <TaskDialog
                isOpen={isDialogOpen}
                onClose={handleCloseDialog}
                onSave={handleSaveTask}
                task={editingTask}
                selectedDate={selectedDate}
            />
        </div>
    );
}