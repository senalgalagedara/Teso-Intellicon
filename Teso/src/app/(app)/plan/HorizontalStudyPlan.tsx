"use client";

import React, { useState, useRef } from 'react';
import { Calendar, BookOpen, ListChecks, FileText, Check, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

interface PlanDay {
  day: number;
  lessons: Array<{ 
    id: string; 
    label: string; 
    status: string;
  }>;
  mcqUnit: string;
  unitPart: string;
}

interface HorizontalStudyPlanProps {
  plan: PlanDay[];
  onDayClick: (dayIndex: number, lessonIds: string[]) => void;
  onMarkCovered: (lessonId: string) => void;
}

export function HorizontalStudyPlan({ plan, onDayClick, onMarkCovered }: HorizontalStudyPlanProps) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; lessonId: string } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleDayClick = (dayIndex: number) => {
    setSelectedDay(dayIndex);
    const lessonIds = plan[dayIndex].lessons.map(l => l.id);
    onDayClick(dayIndex, lessonIds);
  };

  const handleContextMenu = (e: React.MouseEvent, lessonId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, lessonId });
  };

  const handleMarkComplete = (lessonId: string) => {
    onMarkCovered(lessonId);
    setContextMenu(null);
  };

  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
    }
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <div className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-b from-card/95 to-card/98 backdrop-blur-md border-t border-border shadow-2xl transition-transform duration-300 ${
      isCollapsed ? 'translate-y-full' : 'translate-y-0'
    }`}>
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -top-8 left-1/2 -translate-x-1/2 p-1.5 rounded-t-lg bg-secondary/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all hover:scale-105 shadow-lg border border-b-0 border-border"
      >
        {isCollapsed ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      <div className="relative h-full flex flex-col">
        {/* Scrollable Days Container */}
        <div
          ref={scrollRef}
          className="flex gap-2.5 px-4 py-2.5 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        >
          {plan.map((dayPlan, dayIndex) => {
            const isSelected = selectedDay === dayIndex;
            
            return (
              <div
                key={dayPlan.day}
                onClick={() => handleDayClick(dayIndex)}
                className={`flex-shrink-0 w-56 bg-card/50 backdrop-blur-sm border-2 rounded-lg p-2 cursor-pointer transition-all duration-300 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 ${
                  isSelected
                    ? 'border-green-500 shadow-xl shadow-green-500/20 bg-muted/40'
                    : 'border-border/50'
                }`}
              >
                {/* Day Number */}
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-600 to-green-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                    {dayPlan.day}
                  </div>
                  <span className="text-xs font-bold text-foreground">Day {dayPlan.day}</span>
                </div>

                {/* Compact Content */}
                <div className="space-y-1.5">
                  {/* Lesson Names */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <BookOpen className="w-2.5 h-2.5 text-purple-400" />
                      <span className="text-[10px] font-semibold text-muted-foreground">Lessons</span>
                    </div>
                    <div className="space-y-0.5">
                      {dayPlan.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          onContextMenu={(e) => handleContextMenu(e, lesson.id)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-all cursor-context-menu ${
                            lesson.status === 'covered' || lesson.status === 'understand'
                              ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-300'
                              : 'bg-secondary/40 border-border/50 text-foreground hover:bg-muted hover:border-border'
                          }`}
                        >
                          {(lesson.status === 'covered' || lesson.status === 'understand') && (
                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <Check className="w-1.5 h-1.5 text-white" />
                            </div>
                          )}
                          <span className="flex-1 text-[10px] font-medium truncate">{lesson.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* MCQ Unit */}
                  <div className="flex items-center gap-1.5 bg-blue-500/5 border border-blue-500/20 rounded px-2 py-1">
                    <ListChecks className="w-2.5 h-2.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-semibold text-blue-500 dark:text-blue-400">MCQ</div>
                      <div className="text-[10px] text-foreground truncate">{dayPlan.mcqUnit}</div>
                    </div>
                  </div>

                  {/* Part 2 Unit */}
                  <div className="flex items-center gap-1.5 bg-amber-500/5 border border-amber-500/20 rounded px-2 py-1">
                    <FileText className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-semibold text-amber-500 dark:text-amber-400">Part 2</div>
                      <div className="text-[10px] text-foreground truncate">{dayPlan.unitPart}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Arrows - Floating */}
        <button
          onClick={scrollLeft}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-secondary/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all hover:scale-105 shadow-lg border border-border"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={scrollRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-secondary/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all hover:scale-105 shadow-lg border border-border"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (() => {
        const lesson = plan
          .flatMap(d => d.lessons)
          .find(l => l.id === contextMenu.lessonId);
        const isCompleted = lesson?.status === 'covered' || lesson?.status === 'understand';
        
        return (
          <div
            className="fixed bg-card backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
            style={{ 
              left: `${contextMenu.x}px`, 
              top: `${contextMenu.y}px`,
              minWidth: '200px'
            }}
          >
            <div className="px-3 py-2 bg-muted/30 border-b border-border">
              <p className="text-[11px] font-semibold text-muted-foreground truncate">
                {lesson?.label}
              </p>
            </div>
            <div className="py-1">
              <button
                onClick={() => handleMarkComplete(contextMenu.lessonId)}
                className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-green-500/10 transition-all flex items-center gap-3 group"
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  isCompleted 
                    ? 'bg-green-500 shadow-lg shadow-green-500/30' 
                    : 'bg-muted group-hover:bg-green-500'
                }`}>
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>{isCompleted ? 'Completed' : 'Mark as Covered'}</span>
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
